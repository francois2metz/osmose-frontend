require('leaflet');
require('leaflet-sidebar');
require('leaflet-sidebar/src/L.Control.Sidebar.css');
const Cookies = require('js-cookie');

require('./Osmose.Menu.css');


export var OsmoseMenu = L.Control.Sidebar.extend({

  options: {
    closeButton: false,
    autoPan: false,
  },

  initialize(placeholder, permalink, params, options) {
    this._$container = $(`#${placeholder}`);
    this._permalink = permalink;

    const self = this;
    $("div#tests input[type='checkbox']").change(function () {
      self._checkbox_click(this);
    });
    $('.toggleAllItem').click(function () {
      self._toggleAllItem(this);
      return false;
    });
    $('.invertAllItem').click(() => {
      self._invertAllItem();
      return false;
    });
    $('.toggleCateg').click(function () {
      self._toggleCateg(this);
      return false;
    });
    $('#level, #tags, #fixable').change(() => {
      self._change_tags_level_fixable();
    });
    $('#togglemenu').click(() => {
      self.toggle();
      return false;
    });

    this._setParams({ params });
    this._change_tags_level_fixable();
    this._countItemAll();

    L.Control.Sidebar.prototype.initialize.call(this, placeholder, options);
    this._permalink.on('update', this._setParams, this);
  },

  // Menu
  toggle() {
    L.Control.Sidebar.prototype.toggle.call(this);
    if ($('.leaflet-active-area').css('left') == '0px') {
      $('.leaflet-active-area').css('left', '');
    } else {
      $('.leaflet-active-area').css('left', '0px');
    }
    this._itemChanged();
  },

  // Update checkbox count
  _countItem(test_group) {
    let count_checked = 0;
    let count_tests = 0;
    $.each($("input[type='checkbox']", test_group), (index, checkbox) => {
      if ($(checkbox).is(':checked')) {
        count_checked++;
      }
      count_tests++;
    });
    $('.count', test_group).html(`${count_checked}/${count_tests}`);
  },

  _countItemAll() {
    const self = this;
    $('.test_group').each((i, group) => {
      self._countItem(group);
    });
  },

  // Click on a checkbox
  _checkbox_click(cb) {
    this._countItem($(cb).closest('.test_group'));
    this._itemChanged();
  },

  // Show or hide a group of tests
  _toggleCateg(id) {
    const ul = $('ul', $(id).closest('.test_group'));
    if (ul.is(':visible')) {
      ul.slideUp(200);
      $(id).addClass('folded');
    } else {
      ul.slideDown(200);
      $(id).removeClass('folded');
    }
  },

  // Check or uncheck a categ of tests.
  _toggleAllItem(link) {
    const test_group = $(link).closest('.test_group, #myform');
    const checkbox = $(`${test_group.prop('tagName') != 'FORM' ? '' : '.test_group:not(#categUnactiveItem) '}input[type='checkbox']`, test_group);
    if ($(link).data().view == 'all') {
      checkbox.prop('checked', true);
    } else {
      checkbox.prop('checked', false);
    }

    if (test_group.prop('tagName') == 'FORM') {
      this._countItemAll(test_group);
    } else {
      this._countItem(test_group);
    }
    this._itemChanged();
  },

  // Invert item check
  _invertAllItem() {
    $("#myform .test_group:not(#categUnactiveItem) input[type='checkbox']").each(function () {
      $(this).prop('checked', !$(this).prop('checked'));
    });

    this._countItemAll();
    this._itemChanged();
  },

  // Change tags, level, fixable
  _change_tags_level_fixable_display(tag, level, fixable) {
    $('div#tests li').each(function () {
      const id = parseInt($(this).attr('id').replace(/item_desc/, ''), 10);
      if ($.inArray(id, item_levels[level]) >= 0 && (!(tag in item_tags) || $.inArray(id, item_tags[tag]) >= 0)) {
        $(`#item_desc${id}`).show();
      } else {
        $(`#item_desc${id}`).hide();
      }
    });

    const ll = level.split(',');
    for (let i = 1; i <= 3; i++) {
      if ($.inArray(i.toString(), ll) >= 0) {
        $(`.level-${i}`).removeClass('disabled');
      } else {
        $(`.level-${i}`).addClass('disabled');
      }
    }
  },

  _change_tags_level_fixable() {
    const new_tag = document.myform.tags.value;
    const new_level = document.myform.level.value;
    const fixable = document.myform.fixable.value;

    this._change_tags_level_fixable_display(new_tag, new_level || '1,2,3', fixable);
    this._itemChanged();
  },

  _itemChanged() {
    this._permalink.update_item(this._buildUrlPart());
  },

  _buildUrlPart() {
    // items list
    let ch = '';
    if ($('.test_group:not(#categUnactiveItem) :checkbox:not(:checked)').length == 0) {
      ch = 'xxxx';
    } else {
      $('.test_group:not(#categUnactiveItem)').each(function () {
        const id = this.id;
        const v = $('h1 span', this).text().split('/');
        if (v[0] == v[1]) {
          ch += `${id.substring(5, 6)}xxx,`;
        } else {
          $(':checked', this).each(function () {
            ch += `${this.name.substr(4)},`;
          });
        }
      });
    }
    ch = ch.replace(/,$/, '');

    const cookies_options = {
      expires: 365,
      path: '/',
    };

    Cookies.set('last_level', document.myform.level.value, cookies_options);
    Cookies.set('last_item', ch, cookies_options);
    Cookies.set('last_tags', document.myform.tags.value, cookies_options);
    Cookies.set('last_fixable', document.myform.fixable.value, cookies_options);

    return {
      item: ch,
      level: document.myform.level.value,
      tags: document.myform.tags.value,
      fixable: document.myform.fixable.value,
    };
  },

  _setParams(e) {
    const params = e.params;
    if (params.item) {
      const checkbox = $('.test_group:not(#categUnactiveItem) :checkbox');
      checkbox.attr('checked', false).prop('checked', false);
      $.each(params.item.split(','), (i, item) => {
        item = new RegExp(`item${item.replace(/x/g, '.')}`);
        checkbox.filter(function () {
          return item.test(this.id);
        }).attr('checked', true).prop('checked', true);
      });
    }

    if (params.level) {
      document.myform.level.value = params.level;
    }

    if (params.tags != undefined) {
      document.myform.tags.value = params.tags;
    }

    if (params.fixable != undefined) {
      document.myform.fixable.value = params.fixable;
    }

    this._change_tags_level_fixable_display(document.myform.tags.value, document.myform.level.value, document.myform.fixable.value);

    this._countItemAll();
  },
});


export var OsmoseMenuToggle = L.Control.extend({

  options: {
    position: 'topleft',
    menuText: '',
    menuTitle: 'Menu',
  },

  initialize(menu, options) {
    L.Control.prototype.initialize.call(this, options);
    this._menu = menu;
  },


  onAdd(map) {
    const menuName = 'leaflet-control-menu-toggle';
    const container = L.DomUtil.create('div', `${menuName} leaflet-bar`);
    this._map = map;
    this._zoomInButton = this._createButton(this.options.menuText, this.options.menuTitle, `${menuName}-in`, container, this._menuToggle, this);
    return container;
  },

  _menuToggle() {
    this._menu.toggle();
  },

  _createButton(html, title, className, container, fn, context) {
    const link = L.DomUtil.create('a', className, container);
    link.style = 'background-image: url(/images/menu.png)'; // Firefox
    link.style['background-image'] = 'url(/images/menu.png)'; // Chrome
    link.innerHTML = html;
    link.href = '#';
    link.title = title;

    const stop = L.DomEvent.stopPropagation;

    L.DomEvent
      .on(link, 'click', stop)
      .on(link, 'mousedown', stop)
      .on(link, 'dblclick', stop)
      .on(link, 'click', L.DomEvent.preventDefault)
      .on(link, 'click', fn, context)
      .on(link, 'click', this._refocusOnMap, context);

    return link;
  },
});
