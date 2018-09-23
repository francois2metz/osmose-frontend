require('leaflet');
const Pbf = require('pbf');
const topojson = require('topojson');
const geobuf = require('./geobuf-1.0.1.js');


export var OsmoseCoverage = L.GeoJSON.extend({

  initialize(topojson_url, options) {
    L.Util.setOptions(this, options);

    this._layers = {};
    this._topojson_url = topojson_url;
    this._topojson = null;
  },

  onAdd(map, insertAtTheBottom) {
    this._map = map;
    if (this._topojson === null) {
      this.fetchData();
    }

    L.FeatureGroup.prototype.onAdd.call(this, map, insertAtTheBottom);
  },

  fetchData() {
    const self = this;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', this._topojson_url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function (e) {
      if (this.status == 200) {
        let data = geobuf.decode(new Pbf(new Uint8Array(xhr.response)));
        data = topojson.feature(data, data.objects['osmose-cover']);
        self.addData(data);
        self._topojson = data;
      }
    };

    xhr.send();
  },
});
