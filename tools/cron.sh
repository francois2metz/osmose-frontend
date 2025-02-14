#! /bin/bash

set -e

DATABASE=osmose_frontend
DIR_DUMP="/data/work/$(whoami)/"


# Update various tables in database

psql -d $DATABASE -c "
DELETE FROM dynpoi_status
WHERE date < now()-interval '7 day' AND status = 'done';
"

psql -d $DATABASE -c "
CREATE TEMP TABLE stats_update AS
SELECT
  stats.source,
  stats.class,
  now()::timestamp AS timestamp,
  c.count
FROM (
  SELECT
    dynpoi_class.source,
    dynpoi_class.class,
    count(marker.source) AS count
  FROM dynpoi_class
    LEFT JOIN marker ON
      dynpoi_class.source = marker.source AND
      dynpoi_class.class = marker.class
  GROUP BY
    dynpoi_class.source,
    dynpoi_class.class
  ) AS c
    JOIN stats ON
      stats.source = c.source AND
      stats.class = c.class AND
      upper(stats.timestamp_range) IS NULL AND
      stats.count != c. count
;

UPDATE
  stats
SET
  timestamp_range = tsrange(lower(timestamp_range), stats_update.timestamp),
  count = stats_update.count
FROM
  stats_update
WHERE
  stats_update.source = stats.source AND
  stats_update.class = stats.class AND
  upper(stats.timestamp_range) IS NULL
;

INSERT INTO stats (
  SELECT
    source,
    class,
    count,
    tsrange(timestamp, NULL)
  FROM
    stats_update
);
"

psql -d $DATABASE -c "
UPDATE dynpoi_item SET levels = (
  SELECT array_agg(level)
  FROM (
    SELECT level
    FROM class
    WHERE item = dynpoi_item.item
    GROUP BY level
    ORDER BY level
  ) AS a
);
"

psql -d $DATABASE -c "
UPDATE dynpoi_item SET number = (
  SELECT array_agg(n)
  FROM (
    SELECT sum(CASE WHEN marker.item IS NOT NULL THEN 1 ELSE 0 END) AS n
    FROM class
      LEFT JOIN marker ON marker.item = dynpoi_item.item
    WHERE class.item = dynpoi_item.item
    GROUP BY level
    ORDER BY level
  ) AS a
);
"

psql -d $DATABASE -c "
UPDATE dynpoi_item SET tags = (
  SELECT array_agg(tag)
  FROM (
    SELECT tag
    FROM (
      SELECT unnest(tags) AS tag
      FROM class
      WHERE item = dynpoi_item.item
      ) AS a
    WHERE tag != ''
    GROUP BY tag
    ORDER BY tag
  ) AS a
);
"

mkdir -p "$DIR_DUMP/tmp"
mkdir -p "$DIR_DUMP/export"


# Dump of errors - commented, because it takes a long time on a big database

#pg_dump -t dynpoi_status_id_seq -t dynpoi_categ -t dynpoi_class -t dynpoi_item -t dynpoi_update_last -t marker -t marker_elem -t marker_fix -t source $DATABASE \
#  | bzip2 > "$DIR_DUMP/tmp/osmose-planet-latest.sql.bz2.tmp"
#mv "$DIR_DUMP/tmp/osmose-planet-latest.sql.bz2.tmp" "$DIR_DUMP/export/osmose-planet-latest.sql.bz2"
#
#psql $DATABASE -c "COPY (SELECT source.country,
#             source.analyser,
#             marker.lat,
#             marker.lon,
#             marker.elems,
#             marker.class,
#             marker.subclass,
#             marker.item
#      FROM marker
#      LEFT JOIN source ON source.id = marker.source)
#TO STDOUT WITH CSV HEADER;" | bzip2 > "$DIR_DUMP/tmp/osmose-planet-latest.csv.bz2"
#mv "$DIR_DUMP/tmp/osmose-planet-latest.csv.bz2" "$DIR_DUMP/export/osmose-planet-latest.csv.bz2"


# Dump menu items

pg_dump --data-only -t dynpoi_categ -t dynpoi_item $DATABASE \
  | bzip2 > "$DIR_DUMP/tmp/osmose-menu.sql.bz2.tmp"
mv "$DIR_DUMP/tmp/osmose-menu.sql.bz2.tmp" "$DIR_DUMP/export/osmose-menu.sql.bz2"
