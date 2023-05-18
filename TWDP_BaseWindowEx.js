请你检查以下rpg maker mv插件的代码，其中含有一个bug，导致没有#{F:事件序号}前缀的普通对话框只能显示一行文字，请你找出其中出问题的部分并指出如何修复：//=============================================================================
// Trentswd Plugins - ShowMessageEx
// TWDP_BaseWindowEx.js
//=============================================================================

var Imported = Imported || {};
Imported.TWDP_BaseWindowEx = true;

var TWDP = TWDP || {};
TWDP.BWE = TWDP.BWE || {};

//=============================================================================
/*:
 * @plugindesc v1.00 Extend the show message window.
 * @author Trentswd
 *
 * @param Use TWD Window Skin
 * @desc Wether to use the TWD Window Skin or not.
 * true - Use  false - Don't Use
 * @default true
 *
 * @param Default Window Skin
 * @desc The name of window skin by default. Only available when TWD Window Skin is used. Empty for no change.
 * @default
 *
 * @param User Window Meta
 * @desc A json that control window's apparence. The example is listed in help.
 * @default {}
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Don't have time to write this right now, sorry.
 *
 * Default Window Meta
 * --------------------
 * {
 *   "fontSize": 28,
 *   "padding": 24,
 *   "fontColor": "#785028",
 *   "lineHeight": 36,
 *   "textOutline": false,
 *   "textShadowed": true,
 *   "shadowColor": "rgba(0,0,0,0)",
 *   "shadowDistance": 1,
 *   "fuki": {
 *     "maxWidth": 480,
 *     "maxWidthWithPortrait": 360,
 *     "minWidth": 80,
 *     "minWidthWithPortrait": 120,
 *     "maxLines": 4,
 *     "minLines": 1,
 *     "minLinesWidthPortrait": 3,
 *     "arrowHeight": 15,
 *     "portrait": {
 *        "indent": 20,
 *        "spacing": 20,
 *        "distanceToButtom": 5
 *      }
 *   }
 *}
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 * Don't have time to write this right now, sorry.
 *
 */
//=============================================================================

//=============================================================================
// Parameter Variables
//=============================================================================

TWDP.parameters = PluginManager.parameters('TWDP_BaseWindowEx');
TWDP.BWE.param = TWDP.BWE.Param || {};

TWDP.BWE.param.ifUseTwdSkin = eval(String(TWDP.parameters['Use TWD Window Skin']));
TWDP.BWE.param.defaultWindowSkin = String(TWDP.parameters['Default Window Skin']).trim();
TWDP.BWE.param.userWindowMeta = String(TWDP.parameters['User Window Meta']).trim();

function TwdWindowskin() {
  this.initialize.apply(this, arguments);
}

function mergeObject(obj1, obj2) {
  var obj3 = {}
  for (var key in obj1) {
    if (obj2.hasOwnProperty(key)) {
      if (obj1[key] instanceof Object) {
        var ob = mergeObject(obj1[key], obj2[key]);
        obj3[key] = ob;
      } else {
        obj3[key] = obj2[key]
      }
    } else {
      obj3[key] = obj1[key];
    }
  }

  for (var key in obj2) {
    if (!obj3.hasOwnProperty(key)) {
      obj3[key] = obj2[key];
    }
  }

  return obj3;
}

(function($) {
  $.backup = $.backup || {}

  // ---- below is TwdWindowSkin ----
  // --------------------------------

  TwdWindowskin.prototype.constructor = TwdWindowskin;

  TwdWindowskin.prototype.initialize = function() {
    this.bitmap = null;
    this.data = null;
    this.bitmapLoaded = false;
    this.dataLoaded = false;
    this._loadListeners = [];
  };

  TwdWindowskin.prototype.addLoadListener = function(listner) {
    if (!this.isLoaded) {
      this._loadListeners.push(listner);
    } else {
      listner();
    }
  };

  TwdWindowskin.TwdSkinCache = [];

  TwdWindowskin.load = function(filename) {
    var skin = TwdWindowskin.TwdSkinCache[filename];
    if (skin) {

    } else {
      skin = new TwdWindowskin();
      skin.bitmap = ImageManager.loadBitmap('img/twdWindowskin/', filename, 0, true);
      skin.bitmap.addLoadListener(skin.onLoadBitmap.bind(skin));

      var xhr = new XMLHttpRequest();
      var url = 'img/twdWindowskin/' + filename + '.json';
      xhr.open('GET', url);
      xhr.overrideMimeType('application/json');
      xhr.onload = function() {
        if (xhr.status < 400) {
          skin.data = JSON.parse(xhr.responseText);
          skin.onLoadData.call(skin);
        }
      }
      xhr.onerror = function() {
        throw new Error('Could not load ' + url);
      };
      xhr.send();

      if (TwdWindowskin.TwdSkinCache.length > 20) {
        TwdWindowskin.TwdSkinCache = [];
      }
      TwdWindowskin.TwdSkinCache[filename] = skin;
    }


    return skin;
  };

  TwdWindowskin.prototype.onLoad = function() {
    if (this.bitmapLoaded && this.dataLoaded) {
      while (this._loadListeners.length > 0) {
        var listener = this._loadListeners.shift();
        listener();
      }
    }
  }

  TwdWindowskin.prototype.onLoadBitmap = function() {
    this.bitmapLoaded = true;
    this.onLoad();
  }
  TwdWindowskin.prototype.onLoadData = function() {
    this.dataLoaded = true;
    this.onLoad();
  }

  Object.defineProperty(TwdWindowskin.prototype, 'isLoaded', {
    get: function() {
      return this.bitmapLoaded && this.dataLoaded;
    },
    configurable: false
  });

  // ---- below is Window ----
  // -------------------------

  $.backup.Window_initialize = Window.prototype.initialize;
  Window.prototype.initialize = function() {
    $.backup.Window_initialize.call(this);
    this._useTwdWindowskin = $.param.ifUseTwdSkin;
    if ($.param.defaultWindowSkin.length > 0) {
      this._twdWindowskin = TwdWindowskin.load($.param.defaultWindowSkin);
      this._twdWindowskin.addLoadListener(this._onTwdWindowskinLoad.bind(this));
    }
    this._initTwdMeta();
    if ($.param.userWindowMeta.length > 0) {
      this.setUserMeta($.param.userWindowMeta);
    }
  }

  Window.prototype._initTwdMeta = function() {
      this._twdMeta =  {
      "fontSize": 50,
      "padding": 50,
      "fontColor": "#785028",
      "lineHeight": 50,
      "textOutline": false,
      "textShadowed": false,
      "shadowColor": "rgba(0,0,0,0)",
      "shadowDistance": 2,
          "fuki": {
             "maxWidth": 480,
              "maxWidthWithPortrait": 360,
              "minWidth": 200,
              "minWidthWithPortrait": 120,
              "maxLines": 4,
              "minLines": 4,
              "minLinesWidthPortrait": 3,
              "arrowHeight": 30,
              "portrait": {
                 "indent": 20,
                 "spacing": 20,
                 "distanceToButtom": 5
              }
          }
      };
    this._twdMetaUser = {};
    this._twdMetaDefault = {};
    this._twdMetaSkin = {};
    this._twdMetaDefault = {
      "fontSize": 100,
      "padding": 50,
      "fontColor": "#785028",
      "lineHeight": 40,
      "textOutline": false,
      "textShadowed": false,
      "shadowColor": "rgba(0,0,0,0)",
      "shadowDistance": 1,
      "fuki": {
        "maxWidth": 480,
        "maxWidthWithPortrait": 600,
        "minWidth": 80,
        "minWidthWithPortrait": 200,
        "maxLines": 4,
        "minLines": 1,
        "minLinesWidthPortrait": 3,
        "arrowHeight": 0,
        "charaHeight": 50,
        "charaSpace": 15,
        "portrait": {
          "indent": 20,
          "spacing": 20,
          "distanceToButtom": 5
        },
        "nameWindow": {
          "offsetX": 0,
          "offsetY": 0,
          "widthDelta": 0,
          "heightDelta": 0
        }
      }
    };
    this._updateTwdMeta();
  };

  Window.prototype._updateTwdMeta = function() {
    this._twdMeta = mergeObject(this._twdMetaDefault, this._twdMetaSkin);
    this._twdMeta = mergeObject(this._twdMeta, this._twdMetaUser);
  }

  Window.prototype.setUserMeta = function(meta) {
    if (typeof meta === 'string' || meta instanceof String) {
      this._twdMetaUser = JSON.parse(meta);
    } else if (meta instanceof Object) {
      this._twdMetaUser = meta;
    }
    this._updateTwdMeta();
  }

  $.backup.Window_createAllParts = Window.prototype._createAllParts;
  Window.prototype._createAllParts = function() {
    $.backup.Window_createAllParts.call(this);
  };

  $.backup.Window_refreshAllParts = Window.prototype._refreshAllParts;
  Window.prototype._refreshAllParts = function() {
    if (this.shouldUseTwdWindowskin) {
      this._refreshMeta();
    }
    $.backup.Window_refreshAllParts.call(this);
    if (this.shouldUseTwdWindowskin) {
      this._refreshAccessories();
    }
  };

  $.backup.Window_updateTransform = Window.prototype.updateTransform;
  Window.prototype.updateTransform = function() {
    this._updateAccessories();
    $.backup.Window_updateTransform.call(this);
  };

  Window.prototype._onTwdWindowskinLoad = function() {
    if (Array.isArray(this._accessories)) {
      for (sprite of this._accessories) {
        this.removeChild(sprite);
      }
      this._accessories = null;
    }
    this._accessoriesCreated = false;
    this._refreshAllParts();
  };

  Object.defineProperty(Window.prototype, 'twdWindowskin', {
    get: function() {
      return this._twdWindowskin;
    },
    set: function(value) {
      if (this._twdWindowskin !== value) {
        this._twdWindowskin = value;
        this._twdWindowskin.addLoadListener(this._onTwdWindowskinLoad.bind(this));
      }
    },
    configurable: true
  });

  Object.defineProperty(Window.prototype, 'useTwdWindowskin', {
    get: function() {
      return this._useTwdWindowskin;
    },
    set: function(value) {
      if (this._useTwdWindowskin !== value) {
        this._useTwdWindowskin = value;
        if (this._twdWindowskin instanceof TwdWindowskin) {
          this._twdWindowskin.addLoadListener(this._onTwdWindowskinLoad.bind(this));
        }
      }
    },
    configurable: true
  });

  Object.defineProperty(Window.prototype, 'isTwdWindowskinLoaded', {
    get: function() {
      return this._twdWindowskin && this._twdWindowskin.isLoaded;
    },
    configurable: false
  });

  Object.defineProperty(Window.prototype, 'shouldUseTwdWindowskin', {
    get: function() {
      return this._useTwdWindowskin && this._twdWindowskin && this._twdWindowskin.isLoaded;
    },
    configurable: false
  });

  Window.prototype.drawTwdBitmap = function(bitmap, w, h, twdSkin, twdArray, xoffset) {
    if (twdArray && Array.isArray(twdArray)) {
      xoffset = xoffset || 0;
      var skin = twdSkin.bitmap;
      var ox, oy, ow, oh, tx, ty, tw, th, fillType
      for (tile of twdArray) {
        ox = eval(String(tile.x));
        oy = eval(String(tile.y));
        ow = eval(String(tile.w));
        oh = eval(String(tile.h));
        tx = eval(String(tile.tx)) + xoffset;
        ty = eval(String(tile.ty));
        tw = eval(String(tile.tw));
        th = eval(String(tile.th));
        fillType = tile.fillType;
        if (fillType === "repeat") {
          var offsetX = tx;
          var maxX = tw + tx;
          var maxY = th + ty
          while (offsetX < maxX) {
            var offsetY = ty;
            while (offsetY < maxY) {
              bitmap.blt(skin, ox, oy, Math.min(ow, maxX - offsetX), Math.min(oh, maxY - offsetY), offsetX, offsetY);
              offsetY += oh;
            }
            offsetX += ow;
          }
        } else {
          bitmap.blt(skin, ox, oy, ow, oh, tx, ty, tw, th);
        }
      }
    }
  }

  $.backup.Window_refreshFrame = Window.prototype._refreshFrame;
  Window.prototype._refreshFrame = function() {
    if (this.shouldUseTwdWindowskin) {
      var w = this._width;
      var h = this._height;

      var bitmap = new Bitmap(w, h);

      this._windowFrameSprite.bitmap = bitmap;
      this._windowFrameSprite.setFrame(0, 0, w, h);

      if (w > 0 && h > 0) {
        this.drawTwdBitmap(bitmap, w, h, this._twdWindowskin, this._twdWindowskin.data.frame);
      }
    } else {
      $.backup.Window_refreshFrame.call(this);
    }
  };

  $.backup.Window_refreshPauseSign = Window.prototype._refreshPauseSign;
  Window.prototype._refreshPauseSign = function() {
    if (this.shouldUseTwdWindowskin) {
      if (!this._twdWindowskin.data.pauseSign.bitmaps || !this._twdWindowskin.data.pauseSign.frames) {
        this._windowPauseSignSprite.bitmap = null;
        return;
      }

      this._windowPauseSignData = {};
      this._refreshAnimationCompoments(this._windowPauseSignSprite, this._windowPauseSignData, this._twdWindowskin.data.pauseSign);
    } else {
      $.backup.Window_refreshPauseSign.call(this);
    }
  };

  Window.prototype._refreshAccessories = function() {
    if (this.shouldUseTwdWindowskin) {
      if (!this._accessoriesCreated) {
        if (Array.isArray(this._accessories)) {
          for (sprite of this._accessories) {
            this.removeChild(sprite);
          }
          this._accessories = null;
        }
        this._accessories = [];
        this._accessoryDatas = [];
        for (acc of this._twdWindowskin.data.accessories) {
          var sprite = new Sprite();
          this._accessories.push(sprite);
          if (acc.p === "up") {
            this.addChild(sprite);
          } else if (acc.p === "mid") {
            this.addChildToBack(sprite);
          } else {
            this.addChildAt(sprite, 0);
          }
        }
        this._accessoriesCreated = true;
      }
      for (var accNo = 0; accNo < this._accessories.length; accNo++) {
        var sprite = this._accessories[accNo];
        this._accessoryDatas[accNo] = {};
        var data = this._accessoryDatas[accNo];
        var skinData = this._twdWindowskin.data.accessories[accNo];
        this._refreshAnimationCompoments(sprite, data, skinData);
      }
    } else {
      if (Array.isArray(this._accessories)) {
        for (sprite of this._accessories) {
          this.removeChild(sprite);
        }
        this._accessories = null;
      }
    }
  };

  Window.prototype._updateAccessoryFrame = function(sprite, data, offset) {
    var currentFrame = data.currentFrame || 0;
    var frames = data.frames || [];
    if (frames.length < 1) {
      return;
    }
    cFrame = frames[currentFrame];
    if (currentFrame + 1 >= data.frameLength) {
      nFrame = frames[0];
    } else {
      nFrame = frames[currentFrame + 1] || cFrame;
    }
    var rate = offset / cFrame.frameCount;

    function result(x, y, rate) {
      if (x === y || rate === 0) {
        return x;
      }
      return x + (y - x) * rate;
    }
    if (data.isCursor) {
      sprite.setFrame(data.width * cFrame.bitmap + data.cursorX, data.cursorY, data.spriteWidth, data.spriteHeight);
      sprite.x = result(cFrame.x + data.spriteX, nFrame.x + data.spriteX, rate);
      sprite.y = result(cFrame.y + data.spriteY, nFrame.y + data.spriteY, rate);
    } else {
      sprite.setFrame(data.width * cFrame.bitmap, 0, data.width, data.height);
      sprite.x = result(cFrame.x, nFrame.x, rate);
      sprite.y = result(cFrame.y, nFrame.y, rate);
    }


    sprite.alpha = result(cFrame.a, nFrame.a, rate);
    sprite.anchor.x = result(cFrame.anchorX, nFrame.anchorX, rate);
    sprite.anchor.y = result(cFrame.anchorY, nFrame.anchorY, rate);
    sprite.scale.x = result(cFrame.scaleX, nFrame.scaleX, rate);
    sprite.scale.y = result(cFrame.scaleY, nFrame.scaleY, rate);
    sprite.rotation = result(cFrame.rotation, nFrame.rotation, rate);
  }

  $.backup.Window_updatePauseSign = Window.prototype._updatePauseSign;
  Window.prototype._updatePauseSign = function() {
    if (this.shouldUseTwdWindowskin) {
      var sprite = this._windowPauseSignSprite;
      if (this.pause) {
        var data = this._windowPauseSignData;
        this._updateAnimationCompoments(sprite, data);
        sprite.visible = this.isOpen();
      } else {
        sprite.alpha = 0;
      }
    } else {
      $.backup.Window_updatePauseSign.call(this);
    }
  };

  Window.prototype._updateAccessories = function() {
    if (this.shouldUseTwdWindowskin) {
      if (Array.isArray(this._accessories)) {
        for (var accNo = 0; accNo < this._accessories.length; accNo++) {
          var sprite = this._accessories[accNo];
          var data = this._accessoryDatas[accNo];
          this._updateAnimationCompoments(sprite, data);
          sprite.visible = this.isOpen();
          sprite.alpha *= this.alpha;
          sprite.alpha *= (this.opacity / 255);
        }
      }
    }
  };

  Window.prototype._refreshMeta = function() {
    this._twdMetaSkin = {};
    if (this.shouldUseTwdWindowskin) {
      if (this._twdWindowskin.data.meta) {
        this._twdMetaSkin = this._twdWindowskin.data.meta;
      }
    }
    this._updateTwdMeta();
    if (this._twdMeta.padding !== undefined) {
      this._padding = this._twdMeta.padding;
    }
  }

  Window_Base.prototype.contentsWidth = function() {
    return this.width - this.padding * 2;
  };

  Window_Base.prototype.contentsHeight = function() {
    return this.height - this.padding * 2;
  };

  $.backup.Window_Base_lineHeight = Window_Base.prototype.lineHeight;
  Window_Base.prototype.lineHeight = function() {
    if (this.shouldUseTwdWindowskin && this._twdMeta && this._twdMeta.lineHeight !== undefined) {
      return this._twdMeta.lineHeight;
    } else {
      return $.backup.Window_Base_lineHeight.call(this);
    }
  };

  $.backup.Window_Base_resetFontSettings = Window_Base.prototype.resetFontSettings;
  Window_Base.prototype.resetFontSettings = function() {
    $.backup.Window_Base_resetFontSettings.call(this);
    if (this.shouldUseTwdWindowskin) {
      {
        this.contents._twdMeta = this.contents._twdMeta || {};
        this.contents._twdMeta.textOutlined = false;
        this.contents._twdMeta.textShadowed = false;
        this.contents._twdMeta.shadowColor = "#000000";
        this.contents._twdMeta.shadowDistance = 2;
      }

      if (this._twdMeta) {
        if (this._twdMeta.fontSize !== undefined) {
          this.contents.fontSize = this._twdMeta.fontSize;
        };
        if (this._twdMeta.fontColor !== undefined) {
          this.contents.textColor = this._twdMeta.fontColor;
        }
        if (this._twdMeta.textOutlined !== undefined) {
          this.contents._twdMeta.textOutlined = this._twdMeta.textOutlined;
        }
        if (this._twdMeta.textShadowed !== undefined) {
          this.contents._twdMeta.textShadowed = this._twdMeta.textShadowed;
        }
        if (this._twdMeta.shadowColor !== undefined) {
          this.contents._twdMeta.shadowColor = this._twdMeta.shadowColor;
        }
        if (this._twdMeta.shadowDistance !== undefined) {
          this.contents._twdMeta.shadowDistance = this._twdMeta.shadowDistance;
        }
        if (this._twdMeta.outlineColor !== undefined) {
          this.contents.outlineColor = this._twdMeta.outlineColor;
        }
        if (this._twdMeta.outlineWidth !== undefined) {
          this.contents.outlineWidth = this._twdMeta.outlineWidth;
        }
      };
    } else {
      this.contents._twdMeta = null;
    }
  };
  $.backup.Window_refreshCursor = Window.prototype._refreshCursor;
  Window.prototype._refreshCursor = function() {
    if (this.shouldUseTwdWindowskin) {
      if (!this._twdWindowskin.data.cursor.bitmaps || !this._twdWindowskin.data.cursor.frames) {
        this._windowCursorSprite.bitmap = null;
        return;
      }
      var pad = this._padding;
      var x = this._cursorRect.x + pad - this.origin.x;
      var y = this._cursorRect.y + pad - this.origin.y;
      var w = this._cursorRect.width;
      var h = this._cursorRect.height;
      var m = 4;
      var x2 = Math.max(x, pad);
      var y2 = Math.max(y, pad);
      var ox = x - x2;
      var oy = y - y2;
      var w2 = Math.min(w, this._width - pad - x2);
      var h2 = Math.min(h, this._height - pad - y2);

      this._windowCursorSprite.move(x2, y2);

      var sprite = this._windowCursorSprite;
      this._windowCursorData = {};
      var data = this._windowCursorData;
      data.width = w;
      data.height = h;
      data.cursorX = x2 - pad - this._cursorRect.x + this.origin.x;
      data.cursorY = y2 - pad - this._cursorRect.y + this.origin.y;
      data.spriteWidth = w2;
      data.spriteHeight = h2;
      data.spriteX = x2;
      data.spriteY = y2;
      data.isCursor = true;
      this._refreshAnimationCompoments(sprite, data, this._twdWindowskin.data.cursor, 'cursor');
    } else {
      $.backup.Window_refreshCursor.call(this);
    }
  };

  $.backup.Window_updateCursor = Window.prototype._updateCursor;
  Window.prototype._updateCursor = function() {
    if (this.shouldUseTwdWindowskin) {
      var sprite = this._windowCursorSprite;
      var data = this._windowCursorData;
      if (!data) {
        return;
      }
      if (!(data.width > 0 && data.height > 0 && data.bitmapCount > 0 && data.frameLength > 0)) {
        return;
      }
      if (this.active) {
        this._updateAnimationCompoments(sprite, data);
      }
      sprite.visible = this.isOpen();

    } else {
      $.backup.Window_updateCursor.call(this);
    }
  };

  // ---- below is Bitmap ----
  // -------------------------

  $.backup.Bitmap_drawTextOutline = Bitmap.prototype._drawTextOutline;
  Bitmap.prototype._drawTextOutline = function(text, tx, ty, maxWidth) {
    if (this._twdMeta) {
      var context = this._context;
      if (this._twdMeta.textShadowed) {
        context.fillStyle = this._twdMeta.shadowColor;
        context.fillText(text, tx + this._twdMeta.shadowDistance, ty + this._twdMeta.shadowDistance, maxWidth);
      } else if (this._twdMeta.textOutlined) {
        context.lineWidth = this.outlineWidth;
        $.backup.Bitmap_drawTextOutline.call(this, text, tx, ty, maxWidth);
      } else {
        //do nothing
      }
    } else {
      $.backup.Bitmap_drawTextOutline.call(this, text, tx, ty, maxWidth);
    }
  };

  // ---- below is Window_Base ----
  // ------------------------------

  $.backup.Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = text.replace(/#/g, '\x1c');
    text = text.replace(/\x1c\x1c/g, '#');
    return $.backup.Window_Base_convertEscapeCharacters.call(this, text);
  };

  $.backup.Window_Base_processCharacter = Window_Base.prototype.processCharacter;
  Window_Base.prototype.processCharacter = function(textState) {
    switch (textState.text[textState.index]) {
      case '\x1c':
        this.processTwdSharpString(this.obtainTwdSharpString(textState), textState);
        break;
      default:
        $.backup.Window_Base_processCharacter.call(this, textState);
        break;
    }
  };

  Window_Base.prototype.obtainTwdSharpString = function(textState) {
    textState.index++;
    var regExp = /^{(.*?)}/i;
    var arr = regExp.exec(textState.text.slice(textState.index));
    if (arr) {
      textState.index += arr[0].length;
      if (arr.length > 1) {
        var paramStr = arr[1];
        var arrayCode = paramStr.split(':');
        var arrayParam = [];
        if (arrayCode.length > 1) {
          arrayParam = arrayCode[1].split(',');
        };
        arrayCode[0] = arrayCode[0].trim();
        for (var i = arrayParam.length - 1; i >= 0; i--) {
          arrayParam[i] = arrayParam[i].trim();
        };
        return {
          code: arrayCode[0].toUpperCase(),
          arrayParam
        };
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  Window_Base.prototype.processTwdSharpString = function(param, textState) {
    if (param === null) {
      return;
    }
    switch (param.code) {
      default: break;
    }
  };

  $.backup.Window_refreshArrows = Window.prototype._refreshArrows;
  Window.prototype._refreshArrows = function() {
    if (this.shouldUseTwdWindowskin) {
      if (!this._twdWindowskin.data.upArrow.bitmaps || !this._twdWindowskin.data.upArrow.frames) {
        this._upArrowSprite.bitmap = null;
      }
      if (!this._twdWindowskin.data.downArrow.bitmaps || !this._twdWindowskin.data.downArrow.frames) {
        this._downArrowSprite.bitmap = null;
      }
      if (!this._upArrowSprite.bitmap || !this._downArrowSprite.bitmap) {
        return;
      }
      // up arrow
      {
        this._upArrowSpriteData = {};
        this._refreshAnimationCompoments(this._upArrowSprite, this._upArrowSpriteData, this._twdWindowskin.data.upArrow, 'arrow');
      }
      // down arrow
      {
        this._downArrowSpriteData = {};
        this._refreshAnimationCompoments(this._downArrowSprite, this._downArrowSpriteData, this._twdWindowskin.data.downArrow, 'arrow');
      }

    } else {
      $.backup.Window_refreshArrows.call(this);
    }
  };

  $.backup.Window_updateArrows = Window.prototype._updateArrows;
  Window.prototype._updateArrows = function() {
    if (this.shouldUseTwdWindowskin) {
      this._downArrowSprite.visible = this.isOpen() && this.downArrowVisible;
      this._upArrowSprite.visible = this.isOpen() && this.upArrowVisible;
      if (this._downArrowSprite.visible && this._downArrowSprite.bitmap) {
        this._updateAnimationCompoments(this._downArrowSprite, this._downArrowSpriteData);
      };
      if (this._upArrowSprite.visible && this._upArrowSprite.bitmap) {
        this._updateAnimationCompoments(this._upArrowSprite, this._upArrowSpriteData);
      };
    } else {
      $.backup.Window_updateArrows.call(this);
    }
  };

  Window.prototype._refreshAnimationCompoments = function(sprite, data, skinData, type) {
    if (type !== 'cursor') {
      var w = this.width;
      var h = this.height;
      data.width = eval(String(skinData.w));
      data.height = eval(String(skinData.h));
    }
    data.bitmapCount = skinData.bitmaps.length;
    data.frameLength = skinData.frames.length;

    if (data.width > 0 && data.height > 0 && data.bitmapCount > 0 && data.frameLength > 0) {
      sprite.bitmap = new Bitmap(data.width * data.bitmapCount, data.height);
      data.totalFrameCount = 0;
      data.frameCounts = [];
      data.frames = [];
      for (var i = 0; i < data.bitmapCount; i++) {
        this.drawTwdBitmap(sprite.bitmap, data.width, data.height, this._twdWindowskin,
          skinData.bitmaps[i], data.width * i);
      }
      for (var i = 0; i < data.frameLength; i++) {
        data.frames[i] = {};
        var frame = skinData.frames[i];
        var tFrame = data.frames[i];

        tFrame.x = (frame.x === undefined) ? 0 : frame.x;
        tFrame.y = (frame.y === undefined) ? 0 : frame.y;
        tFrame.a = (frame.a === undefined) ? 1 : frame.a;

        if (type === 'cursor') {
          tFrame.anchorX = (frame.anchorX === undefined) ? 0 : frame.anchorX;
          tFrame.anchorY = (frame.anchorY === undefined) ? 0 : frame.anchorY;
        } else if (type === 'arrow') {
          tFrame.anchorX = (frame.anchorX === undefined) ? 0.5 : frame.anchorX;
          tFrame.anchorY = (frame.anchorY === undefined) ? 0.5 : frame.anchorY;
        } else {
          tFrame.anchorX = (frame.anchorX === undefined) ? 0.5 : frame.anchorX;
          tFrame.anchorY = (frame.anchorY === undefined) ? 1 : frame.anchorY;
        }

        tFrame.scaleX = (frame.scaleX === undefined) ? 1 : frame.scaleX;
        tFrame.scaleY = (frame.scaleY === undefined) ? 1 : frame.scaleY;
        tFrame.rotation = (frame.rotation === undefined) ? 0 : frame.rotation;
        tFrame.bitmap = (frame.bitmap === undefined) ? 0 : frame.bitmap;
        tFrame.frameCount = (frame.frameCount === undefined) ? 1 : frame.frameCount;

        {
          var w = this.width;
          var h = this.height;
          tFrame.x = eval(String(tFrame.x));
          tFrame.y = eval(String(tFrame.y));
          tFrame.a = eval(String(tFrame.a));
          tFrame.anchorX = eval(String(tFrame.anchorX));
          tFrame.anchorY = eval(String(tFrame.anchorY));
          tFrame.scaleX = eval(String(tFrame.scaleX));
          tFrame.scaleY = eval(String(tFrame.scaleY));
          tFrame.rotation = eval(String(tFrame.rotation));
          tFrame.bitmap = eval(String(tFrame.bitmap));
          tFrame.frameCount = eval(String(tFrame.frameCount));
        }

        data.totalFrameCount += tFrame.frameCount;
        data.frameCounts[i] = tFrame.frameCount;
        if (data.frameCounts[i - 1]) {
          data.frameCounts[i] += data.frameCounts[i - 1];
        }
      }
      data.currentFrame = 0;
      this._updateAccessoryFrame(sprite, data, 0);
    } else {
      sprite.bitmap = null;
      sprite.a = 0;
    }
  };

  Window.prototype._updateAnimationCompoments = function(sprite, data) {
    if (sprite.bitmap) {
      var currentCount = this._animationCount % data.totalFrameCount;
      for (data.currentFrame = 0; data.currentFrame < data.frameLength; data.currentFrame++) {
        if (data.frameCounts[data.currentFrame] >= currentCount) {
          break;
        }
      }
      var currentFrameCount = data.frames[data.currentFrame].frameCount;
      var lastFrameCount = data.frameCounts[data.currentFrame] - currentFrameCount;
      var offset = currentCount - lastFrameCount;
      this._updateAccessoryFrame(sprite, data, offset);
    }
  };

})(TWDP.BWE);
//=============================================================================
// Trentswd Plugins - ShowMessageEx
// TWDP_ShowMessageEx.js
//=============================================================================

var Imported = Imported || {};
Imported.TWDP_ShowMessageEx = true;

var TWDP = TWDP || {};
TWDP.SME = TWDP.SME || {};

//=============================================================================
/*:
 * @plugindesc v1.00 Extend the show message window.
 * @author Trentswd
 *
 * @param Text Window Skin
 * @desc The name of window skin for text window. Empty for default skin
 * @default
 *
 * @param Name Window Skin
 * @desc The name of window skin for name window. Empty for default skin
 * @default
 *
 * @param Auto Wrap
 * @desc Auto warp line, and use #{BR} to force warp line.
 * true - Yes false - No
 * @default false
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Don't have time to write this right now, sorry.
 *
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 * Don't have time to write this right now, sorry.
 *
 */
//=============================================================================

//=============================================================================
// Parameter Variables
//=============================================================================

TWDP.parameters = PluginManager.parameters('TWDP_ShowMessageEx');
TWDP.SME.param = TWDP.SME.param || {};

TWDP.SME.param.textWindowSkin = String(TWDP.parameters['Text Window Skin']);
TWDP.SME.param.nameWindowSkin = String(TWDP.parameters['Name Window Skin']);
TWDP.SME.param.autoWrap = eval(String(TWDP.parameters['Auto Wrap']));


(function($) {

  $.backup = $.backup || {}

  // ---- below is .Game_Interpreter ----
  // ------------------------------------

  // Show Text
  $.backup.Game_Interpreter_command101 = Game_Interpreter.prototype.command101;
  Game_Interpreter.prototype.command101 = function() {
    if ($gameMessage.isWaitingForNext()) {
      while (this.nextEventCode() === 401) { // Text data
        this._index++;
        $gameMessage.add(this.currentCommand().parameters[0]);
      }
      switch (this.nextEventCode()) {
        case 102: // Show Choices
          this._index++;
          this.setupChoices(this.currentCommand().parameters);
          break;
        case 103: // Input Number
          this._index++;
          this.setupNumInput(this.currentCommand().parameters);
          break;
        case 104: // Select Item
          this._index++;
          this.setupItemChoice(this.currentCommand().parameters);
          break;
      }
      this._index++;
      this.setWaitMode('message');
      $gameMessage._twd.flagWaitingForNext = false;
      $gameMessage._twd.hasNext = true;
    } else {
      $.backup.Game_Interpreter_command101.call(this);
    }
    return false;
  };

  // Show Choices
  $.backup.Game_Interpreter_command102 = Game_Interpreter.prototype.command102;
  Game_Interpreter.prototype.command102 = function() {
    if ($gameMessage.isWaitingForNext()) {
      this.setupChoices(this._params);
      this._index++;
      this.setWaitMode('message');
      $gameMessage._twd.flagWaitingForNext = false;
      $gameMessage._twd.hasNext = true;
    } else {
      $.backup.Game_Interpreter_command102.call(this)
    }
    return false;
  };

  // Input Number
  $.backup.Game_Interpreter_command103 = Game_Interpreter.prototype.command103;
  Game_Interpreter.prototype.command103 = function() {
    if ($gameMessage.isWaitingForNext()) {
      this.setupNumInput(this._params);
      this._index++;
      this.setWaitMode('message');
      $gameMessage._twd.flagWaitingForNext = false;
      $gameMessage._twd.hasNext = true;
    } else {
      $.backup.Game_Interpreter_command103.call(this)
    }
    return false;
  };

  // Select Item
  $.backup.Game_Interpreter_command104 = Game_Interpreter.prototype.command104;
  Game_Interpreter.prototype.command104 = function() {
    if ($gameMessage.isWaitingForNext()) {
      this.setupItemChoice(this._params);
      this._index++;
      this.setWaitMode('message');
      $gameMessage._twd.flagWaitingForNext = false;
      $gameMessage._twd.hasNext = true;
    } else {
      $.backup.Game_Interpreter_command104.call(this)
    }
    return false;
  };

  // ---- below is Game_Message ----
  // -------------------------------

  $.backup.Game_Message_clear = Game_Message.prototype.clear;
  Game_Message.prototype.clear = function() {
    $.backup.Game_Message_clear.call(this);
    this._twd = {};
    this._twd.flagWaitingForNext = false;
    this._twd.hasNext = false;
  };

  Game_Message.prototype.isWaitingForNext = function() {
    return this._twd.flagWaitingForNext && !(this.isChoice() || this.isNumberInput() || this.isItemChoice());
  };

  $.backup.Game_Message_isBusy = Game_Message.prototype.isBusy;
  Game_Message.prototype.isBusy = function() {
    if (this.isWaitingForNext()) {
      return false;
    };
    return $.backup.Game_Message_isBusy.call(this);
  };

  $.backup.Game_Message_allText = Game_Message.prototype.allText;
  Game_Message.prototype.allText = function() {
    if (!this._texts || this._texts.length === 0) {
      return '';
    };
    var str = $.backup.Game_Message_allText.call(this);
    if ($.param.autoWrap) {
      str = str.replace(/\n/g, '');
    }
    return str;
  }

  // ---- below is Window_Message ----
  // ---------------------------------

  $.backup.Window_Message_initialize = Window_Message.prototype.initialize;
  Window_Message.prototype.initialize = function() {
    this._preloadResult = {};
    this.initResult(this._preloadResult);

    $.backup.Window_Message_initialize.call(this);

    this._createTwdNameWindow();
    this._createTwdPortrait();

    if ($.param.textWindowSkin.length > 0) {
      this.useTwdWindowskin = true;
      this.twdWindowskin = TwdWindowskin.load($.param.textWindowSkin);

      //this._goldWindow.useTwdWindowskin = true;
      // this._choiceWindow.useTwdWindowskin = true;
      // this._numberWindow.useTwdWindowskin = true;
      //  this._itemWindow.useTwdWindowskin = true;
      //this._twdNameWindow.useTwdWindowskin = true;

      // this._goldWindow.twdWindowskin = this.twdWindowskin;
      // this._choiceWindow.twdWindowskin = this.twdWindowskin;
      // this._numberWindow.twdWindowskin = this.twdWindowskin;
      // this._itemWindow.twdWindowskin = this.twdWindowskin;
      // this._twdNameWindow.twdWindowskin = this.twdWindowskin;
    }

    if ($.param.nameWindowSkin.length > 0) {
      this._twdNameWindow.useTwdWindowskin = true;
      this._twdNameWindow.twdWindowskin = TwdWindowskin.load($.param.nameWindowSkin);
    }

  };

  Window_Message.prototype._createTwdNameWindow = function() {
    this._twdNameWindow = new Window_Base(1, 1);
    this._twdNameWindow.x = this.x;
    this._twdNameWindow.visible = false;
    this._preloadResult.showNameWindow = false;
    this.addChild(this._twdNameWindow);
  };

  Window_Message.prototype._refreshTwdNameWindow = function(name) {
    this._twdNameWindow.resetFontSettings();
    var x = this.calcNewLineLeft(this._preloadResult) + this.padding - this._twdNameWindow.padding + this._twdNameWindow._twdMeta.fuki.nameWindow.offsetX;
    textState = {};
    textState.index = 0;
    textState.text = name;
    var height = this._twdNameWindow.calcTextHeight(textState) + this._twdNameWindow.padding * 2 + this._twdNameWindow._twdMeta.fuki.nameWindow.heightDelta;
    var width = this._twdNameWindow.textWidth(name) + this._twdNameWindow.padding * 2 + this._twdNameWindow._twdMeta.fuki.nameWindow.widthDelta;
    var y = -height + this._twdNameWindow._twdMeta.fuki.nameWindow.offsetY;
    this._twdNameWindow.visible = true;
    this._twdNameWindow.move(x, y, width, height);
    this._twdNameWindow.createContents();
    this._twdNameWindow.contents.drawText(name, 0, 0, this._twdNameWindow.contents.width,
      this._twdNameWindow.contents.height, 'center');
    this._preloadResult.showNameWindow = true;
    this._twdNameWindow._openness = 0;
    this._twdNameWindow.open();
  };

  Window_Message.prototype._updateTwdNameWindow = function(name) {
    if (this.isOpen() && this._preloadResult.showNameWindow) {
      this._twdNameWindow.visible = true;
    } else {
      if (this._twdNameWindow.isClosed()) {
        this._twdNameWindow.visible = false;
      } else if (this._twdNameWindow.isOpen()) {
        this._twdNameWindow.close();
      }
    }
    if (this._twdNameWindow.visible) {
      this._twdNameWindow.update();
      if (this._twdNameWindow._opening || this._twdNameWindow._closing) {
        return false;
      }
    }
    return true;
  };

  Window_Message.prototype._createTwdPortrait = function() {
    this._twdPortrait = new Sprite();
    this._twdPortrait.visible = false;
    this.addChild(this._twdPortrait);
    this._preloadResult.showPortrait = false;
  };

  Window_Message.prototype._refreshTwdPortrait = function(bitmap, mirrow, index) {
    index = index || 0;
    var bitmapWidth = bitmap.width;
    if (index > 0) {
      this._twdPortrait.bitmap = bitmap;
      index--;
      var wUnit = bitmap.width / 4;
      var hUnit = bitmap.height / 2;
      bitmapWidth = wUnit;
      this._twdPortrait.setFrame((index % 4) * wUnit, Math.floor(index / 4) * hUnit, wUnit, hUnit);
    } else {
      this._twdPortrait.bitmap = bitmap;
      this._twdPortrait.setFrame(0, 0, bitmap.width, bitmap.height);
    }

    this._twdPortrait.visible = true;
    this._twdPortrait.anchor.x = 0.5;
    this._twdPortrait.anchor.y = 1;

    this._twdPortrait.x = this._twdMeta.fuki.portrait.indent + bitmapWidth / 2;
    this._twdPortrait.y = this.height - this._twdMeta.fuki.portrait.distanceToButtom;

    if (mirrow) {
      this._twdPortrait.scale.x = -1;
    } else {
      this._twdPortrait.scale.x = 1;
    }
    this._preloadResult.showPortrait = true;
  };

  Window_Message.prototype._updateTwdPortrait = function(bitmap, mirrow) {
    if (this.isOpen() && this._preloadResult.showPortrait) {
      this._twdPortrait.visible = true;
    } else {
      this._twdPortrait.visible = false;
    }
    return true;
  };

  Window_Message.prototype.continueMessage = function() {
    this._textState.text += this.convertEscapeCharacters($gameMessage.allText());
    $gameMessage._twd.hasNext = false;
  };

  Window_Message.prototype.canContinue = function() {
    return !$gameMessage.scrollMode() && $gameMessage._twd.hasNext;
  };

  $.backup.Window_Message_update = Window_Message.prototype.update;
  Window_Message.prototype.update = function() {
    if (this.canContinue()) {
      this.continueMessage();
    };

    if (this.isFuki() && this.visible) {
      this.updateFukiPlacement();
    }

    if (!this._updateTwdPortrait()) {
      return;
    }
    if (!this._updateTwdNameWindow()) {
      return;
    }

    if (!this._updateScrollContents()) {
      return;
    }

    return $.backup.Window_Message_update.call(this);
  };

  Window_Message.prototype.isFuki = function() {
    if (this._preloadResult.fuki.enabled) {
      return true;
    }
    return false;
  }

  Window_Message.prototype.hasImageToLoad = function() {
    if (this.hasMessageFace() ||
      this.hasPortraits() ||
      this.hasProfiles()) {
      return true;
    }
    return false;
  }

  Window_Message.prototype.hasFaceToShow = function() {
    if (this.hasMessageFace() ||
      this.hasPortraits()) {
      return true;
    }
    return false;
  }

  Window_Message.prototype.hasMessageFace = function() {
    if ($gameMessage.faceName().length > 0) {
      return true;
    }
    return false;
  }

  Window_Message.prototype.hasPortraits = function() {
    if (Object.keys(this._preloadResult.portraits).length > 0) {
      return true;
    }
    return false;
  }

  Window_Message.prototype.hasProfiles = function() {
    if (Object.keys(this._preloadResult.pictures).length > 0) {
      return true;
    }
    return false;
  }

  $.backup.Window_Message_doesContinue = Window_Message.prototype.doesContinue;
  Window_Message.prototype.doesContinue = function() {
    if (this.isFuki()) {
      return false;
    }
    return $.backup.Window_Message_doesContinue.call(this);
  };

  Window_Message.prototype.processTwdSharpString = function(param, textState) {
    if (param === null) {
      return;
    }
    switch (param.code) {
      case 'NEXT':
        $gameMessage._twd.flagWaitingForNext = true;
        $gameMessage._texts = [];
        break;
      case 'BR': // 换行
        this.processFukiNewLine(textState, this._preloadResult);
        break;
      case 'PP': // 页面暂停
        this.startPagePause();
        break;
      case 'F': //fuki
        break;
      case 'P': // 头像
      case 'PM': // 镜像头像
        {
          var filename = param.arrayParam[0];
          if ($gameMessage.faceName().length > 0) {
            filename = $gameMessage.faceName() + '_' + ($gameMessage.faceIndex() + 1) + '_' + filename;
          }
          var pic = this._preloadResult.portraits[filename];
          if (pic) {
            var mirrow = false;
            if (param.code === 'PM') {
              mirrow = true;
            }
            this._refreshTwdPortrait(pic.bitmap, mirrow);
          }
        }
        break;
      case 'LP': //半身像左边
        break;
      case 'LPM': //半身像左边镜像
        break;
      case 'RP': //半身像右边
        break;
      case 'RPM': //半身像右边镜像
        break;
      case 'N':
        {
          if (param.arrayParam.length === 1) {
            this._refreshTwdNameWindow(param.arrayParam[0]);
          } else if (param.arrayParam.length > 1) {
            var type = param.arrayParam[0];
            var value = param.arrayParam[1];
            if (type.toUpperCase() === 'T') {
              this._refreshTwdNameWindow(value);
            }
          }

        }
        break;
      default:
        Window_Base.prototype.processTwdSharpString.call(this);
        break;
    }
  };

  $.backup.Window_Message_onEndOfText = Window_Message.prototype.onEndOfText;
  Window_Message.prototype.onEndOfText = function() {
    if ($gameMessage.isWaitingForNext()) {
      return;
    }
    $.backup.Window_Message_onEndOfText.call(this);
  };

  Window_Message.prototype.startMessage = function() {
    this._textState = {};
    this._textState.index = 0;
    this._textState.text = this.convertEscapeCharacters($gameMessage.allText());
    this._needPostStart = false;

    this._preloadResult = {};
    this.initResult(this._preloadResult);
    this.previewText(this._textState, this._preloadResult);
    this.loadPictures(this._preloadResult);
    if (!this.hasPortraits()) {
      this.loadMessageFace();
    }

    this._needPostStart = true;

    if (!this.hasImageToLoad()) {
      this.postStartMessage();
    }
  };

  Window_Message.prototype.postStartMessage = function() {
    this._textState.left = this.calcNewLineLeft(this._preloadResult);
    this._textState.x = this._textState.left;

    this._twdMeta.showNameWindow = false;
    this._twdMeta.showPortrait = false;

    this.newPage(this._textState);

    if (this.isFuki()) {
      calcState = {};
      calcState.left = this._textState.left;
      calcState.x = this._textState.x;
      calcState.y = this._textState.y;
      calcState.height = this._textState.height;
      calcState.text = this._textState.text;
      calcState.index = this._textState.index;

      this.calcFukiText(calcState, this._preloadResult);
    }

    this.updatePlacement();
    this.updateBackground();
    this.open();

    if (this.hasMessageFace() && !this.hasPortraits()) {
      this._refreshTwdPortrait(this._faceBitmap, false, $gameMessage.faceIndex() + 1);
      this._faceBitmap = null;
    }

    this._needPostStart = false;
  };

  $.backup.Window_Message_updatePlacement = Window_Message.prototype.updatePlacement;
  Window_Message.prototype.updatePlacement = function() {
    if (this.isFuki()) {
      this.move(0, 0,
        this._preloadResult.fuki.width + this.padding * 2, this._preloadResult.fuki.height + this.padding * 2);
      this._refreshContents();
      this.createContents();
      this._positionType = -1;
      this.updateFukiPlacement();
    } else {
      this.move((Graphics.boxWidth - this.windowWidth()) / 2, this.y, this.windowWidth(), this.windowHeight());
      this.createContents();
      $.backup.Window_Message_updatePlacement.call(this);
    }

  };

  Window_Message.prototype.updateFukiPlacement = function() {
    var charaId = this._preloadResult.fuki.charaId;
    var chara = null;

    if (charaId === 0) {
      chara = $gameMap.event($gameMap._interpreter.eventId());
    } else if (charaId > 0) {
      chara = $gameMap.event(charaId);
    } else if (charaId < 0) {
      charaId = -charaId;
      if (charaId == 1) {
        chara = $gamePlayer;
      } else {
        chara = $gamePlayer.followers().follower(charaId - 2);
      }
    }
    this.updateFukiPlacementByChara(chara);
  }

  Window_Message.prototype.updateFukiPlacementByChara = function(chara) {
    var xReverse = false;
    var yReverse = false;

    var charaHeight = this._preloadResult.charaHeight || 0;
    if (charaHeight <= 0) {
      charaHeight = this._twdMeta.fuki.charaHeight;
    }

    var x1 = chara.screenX() - this.width / 2;
    var x2 = x1 + this.width;
    var y1 = chara.screenY() - this.height - this._twdMeta.fuki.arrowHeight - charaHeight - this._twdMeta.fuki.charaSpace;
    var y2 = y1 + this.height;

    if (y1 < 0) {
      yReverse = true;
      y1 = chara.screenY() + this._twdMeta.fuki.arrowHeight + this._twdMeta.fuki.charaSpace;
      y2 = y1 + this.height;
    }

    if (x1 < 0) {
      x1 = 0;
      x2 = x1 + this.width;
    }

    if (x2 > Graphics.boxWidth) {
      x2 = Graphics.boxWidth;
      x1 = x2 - this.width;
    }

    if (x1 + x2 / 2 > chara.screenX()) {
      xReverse = true;
    }

    var position = 7;
    if (xReverse && yReverse) {
      position = 3;
    } else if (!xReverse && yReverse) {
      position = 9;
    } else if (xReverse && !yReverse) {
      position = 1;
    } else if (!xReverse && !yReverse) {
      //pass
    }

    if (this._preloadResult.fuki.position != position) {
      this._preloadResult.fuki.position = position;
      this._refreshFrame();
      this._refreshBack();
    }

    this.x = x1;
    this.y = y1;
  }


  Window_Message.prototype.updateLoading = function() {
    if (this._faceBitmap || this.hasPortraits() || this.hasProfiles()) {
      if (ImageManager.isReady()) {
        if (this._faceBitmap) {
          this._preloadResult.originFaceWidth = this._faceBitmap.width / 4;
          //this.drawMessageFace();
        }
        if (this._needPostStart) {
          this.postStartMessage();
        }
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  };

  Window_Message.prototype.initResult = function(result) {
    result.fuki = {};
    result.fuki.enabled = false;
    result.fuki.charaId = 0;
    result.fuki.width = 0;
    result.fuki.height = 0;
    result.fuki.lines = 1;
    result.fuki.position = 7;
    result.pictures = [];
    result.portraits = [];
    result.nameWindow = {};
    result.nameWindow.enabled = false;
    result.nameWindow.text = '';
  }
  Window_Message.prototype.previewText = function(textState, result) {
    console.log("in Window_Message.prototype.previewText");
    // 先扫描fuki和头像
    var lastTextIndex = textState.index;
    while (textState.index < textState.text.length) {
      switch (textState.text[textState.index]) {
        case '\x1c':
          {
            var param = this.obtainTwdSharpString(textState)
            switch (param.code) {
              case 'F': //fuki
                result.fuki.enabled = true;
                result.fuki.charaId = eval(param.arrayParam[0]);
                if (param.arrayParam.length > 1) {
                  result.charaHeight = eval(param.arrayParam[1]);
                }
                break;
              case 'P': // 头像
              case 'PM': // 镜像头像
                var ps = {};
                ps.short = param.arrayParam[0];
                ps.filename = ps.short;
                if (!result.portraits[ps.filename]) {
                  if ($gameMessage.faceName().length > 0) {
                    ps.filename = $gameMessage.faceName() + '_' + ($gameMessage.faceIndex() + 1) + '_' + ps.short;
                  }
                  ps.bitmap = null;
                  result.portraits[ps.filename] = ps;
                }
                break;
              case 'LP': //半身像左边
              case 'LPM': //半身像左边镜像
              case 'RP': //半身像右边
              case 'RPM': //半身像右边镜像
                var ps = {};
                ps.short = param.arrayParam[0];
                ps.filename = ps.short;
                if (!result.pictures[ps.filename]) {
                  if ($gameMessage.faceName().length > 0) {
                    ps.filename = $gameMessage.faceName() + '_' + ($gameMessage.faceIndex() + 1) + '_' + ps.short;
                  }
                  ps.bitmap = null;
                  result.pictures[ps.filename] = ps;
                }
                break;
            }
          }
          break;
        default:
          textState.index++;
          break;
      }
    }
    textState.index = lastTextIndex;
    console.log("out Window_Message.prototype.previewText");
  }

  Window_Message.prototype.processFukiNewLine = function(textState, result) {
    if (result.fuki.width < textState.x) {
      result.fuki.width = textState.x;
    }
    textState.x = textState.left;
    textState.y += textState.height;
    textState.height = this.calcTextHeight(textState, false);
    result.fuki.height = textState.y + textState.height;
    result.fuki.lines++;
    //textState.index++;
  };
  Window_Message.prototype.calcFukiText = function(textState, result) {
    var metNewPage = false;
    result.fuki.height = textState.height;
    this.saveFontSetting();
    while (textState.index < textState.text.length) {
      metNewPage = false;
      var c = textState.text[textState.index];
      switch (c) {
        case '\n':
          {
            this.processFukiNewLine(textState, result);
            textState.index++;
          }
          break;
        case '\f':
          textState.index++;
          metNewPage = true;
          break;
        case '\x1b':
          {
            code = this.obtainEscapeCode(textState);
            switch (code) {
              case 'C':
              case 'OC':
                this.obtainEscapeParam(textState);
                break;
              case 'I':
                var iconIndex = this.obtainEscapeParam(textState);
                this.drawIcon(iconIndex, textState.x + 2, textState.y + 2);
                textState.x += Window_Base._iconWidth + 4;
                break;
              case '{':
                this.makeFontBigger();
                break;
              case '}':
                this.makeFontSmaller();
                break;
              case 'MSGCORE':
                var id = this.obtainEscapeParam(textState);
                if (id === 0) this.resetFontSettings();
                if (id === 1) this.contents.fontBold = !this.contents.fontBold;
                if (id === 2) this.contents.fontItalic = !this.contents.fontItalic;
                break;
              case 'FS':
                this.contents.fontSize = this.obtainEscapeParam(textState);
                break;
              case 'FN':
                var name = this.obtainEscapeString(textState);
                this.contents.fontFace = name;
                break;
              case 'OW':
                this.contents.outlineWidth = this.obtainEscapeParam(textState);
                break;
              case 'PX':
                textState.x = this.obtainEscapeParam(textState);
                break;
              case 'PY':
                textState.y = this.obtainEscapeParam(textState);
                break;
            }
          }
          break;
        case '\x1c':
          {
            var param = this.obtainTwdSharpString(textState)
            switch (param.code) {
              case 'BR': //半身像右边镜像
                this.processFukiNewLine(textState, result);
                break;
            }
          }
          break;
        default:
          {
            var w = this.textWidth(c);
            var needNewLine = false;
            if ($.param.autoWrap) {
              var maxWidth = 0;
              if (this.hasPortraits()) {
                maxWidth = this._twdMeta.fuki.maxWidthWithPortrait;
              } else {
                maxWidth = this._twdMeta.fuki.maxWidth;
              }

              if (textState.x + w > maxWidth) {
                needNewLine = true;
              }
            }
            if (needNewLine) {
              this.processFukiNewLine(textState, result);
            }

            textState.x += w;
            if (result.fuki.width < textState.x) {
              result.fuki.width = textState.x;
            }

            textState.index++;
          }
          break;
      }

      if (metNewPage) {
        break;
      }
    }

    {
      var maxWidth = this._twdMeta.fuki.maxWidth;
      if (this.hasPortraits()) {
        maxWidth = this._twdMeta.fuki.maxWidthWithPortrait;
      }

      var minWidth = this._twdMeta.fuki.minWidth;
      if (this.hasPortraits()) {
        minWidth = this._twdMeta.fuki.minWidthWithPortrait;
      }

      var maxHeight = this._twdMeta.fuki.maxLines * this.lineHeight();
      var minHeight = this._twdMeta.fuki.minLines * this.lineHeight();

      if (this.hasPortraits()) {
        minHeight = this._twdMeta.fuki.minLinesWidthPortrait * this.lineHeight();
      } else if ($gameMessage.faceName() !== '') {
        var minHeightWithFace = 144;
        if (minHeight < minHeightWithFace) {
          minHeight = minHeightWithFace;
        }
      }

      if (result.fuki.width > maxWidth) {
        result.fuki.width = maxWidth;
      }
      if (result.fuki.height > maxHeight) {
        result.fuki.height = maxHeight;
      }
      if (result.fuki.width < minWidth) {
        result.fuki.width = minWidth;
      }
      if (result.fuki.height < minHeight) {
        result.fuki.height = minHeight;
      }
    }
    this.loadFontSetting();
    return result;
  };
  Window_Message.prototype.saveFontSetting = function() {
    this._backupFontSetting = {};
    var backup = this._backupFontSetting;
    backup.fontFace = this.contents.fontFace;
    backup.fontSize = this.contents.fontSize;
    backup.fontBold = this.contents.fontBold;
    backup.fontItalic = this.contents.fontItalic;
    backup.outlineWidth = this.contents.outlineWidth;
  };
  Window_Message.prototype.loadFontSetting = function() {
    var backup = this._backupFontSetting;
    this.contents.fontFace = backup.fontFace;
    this.contents.fontSize = backup.fontSize;
    this.contents.fontBold = backup.fontBold;
    this.contents.fontItalic = backup.fontItalic;
    this.contents.outlineWidth = backup.outlineWidth;
  };
  Window_Message.prototype.calcNewLineLeft = function(result) {
    //  if (!result || Object.keys(result.portraits).length < 1) {
    //    return this.newLineX();
    //  } else {

    if ($gameMessage.faceName() === '' && !this.hasPortraits()) {
      return 0;
    }
    var left = 0;

    if (!this.hasPortraits()) {
      left = this._preloadResult.originFaceWidth || 0;
    } else {
      for (p in result.portraits) {
        pic = result.portraits[p];
        if (pic.bitmap.width > left) {
          left = pic.bitmap.width;
        }
      }

    }

    if (this._twdMeta && this._twdMeta.fuki !== undefined) {
      left += this._twdMeta.fuki.portrait.indent;
      left += this._twdMeta.fuki.portrait.spacing;
    } else {
      left += this.padding * 2;
    }
    left -= this.padding; // 因为contents相对远点有padding的位移
    return left;
    //  }
  }

  Window_Message.prototype.loadPictures = function(result) {
    for (pic in result.portraits) {
      var p = result.portraits[pic];
      p.bitmap = ImageManager.loadFace(p.filename);
    }

    for (pic in result.pictures) {
      var p = result.pictures[pic];
      p.bitmap = ImageManager.loadFace(p.filename);
    }
  }

  $.backup.Window_Message_terminateMessage = Window_Message.prototype.terminateMessage;
  Window_Message.prototype.terminateMessage = function() {
    $.backup.Window_Message_terminateMessage.call(this);
    this._preloadResult = {};
    this.initResult(this._preloadResult);
  };

  Window_Message.prototype.newPage = function(textState) {
    this.contents.clear();
    this.resetFontSettings();
    this.clearFlags();

    textState.left = this.calcNewLineLeft(this._preloadResult);
    textState.x = textState.left;
    textState.y = 0;
    textState.height = this.calcTextHeight(textState, false);
  };

  $.backup.Window_Message_processNormalCharacter = Window_Message.prototype.processNormalCharacter;
  Window_Message.prototype.processNormalCharacter = function(textState) {
    if ($.param.autoWrap) {
      var c = textState.text[textState.index];
      var w = this.textWidth(c);
      var needNewLine = false;
      var maxWidth = 0;
      if (this.hasPortraits()) {
        maxWidth = this._twdMeta.fuki.maxWidthWithPortrait;
      } else {
        maxWidth = this._twdMeta.fuki.maxWidth;
      }

      if (textState.y + textState.height > this.contents.height) {
        this.startPagePause();
        return;
      }

      if (textState.x + w > maxWidth) {
        needNewLine = true;
      }
      if (needNewLine) {
        this.processFukiNewLine(textState, this._preloadResult);
      }
    }

    if (textState.y + textState.height > this.contents.height) {
      this.startPagePause();
      return;
    }

    $.backup.Window_Message_processNormalCharacter.call(this, textState);
  };

  if (typeof(Window_Message.prototype.isFastForward) === 'function') {
    $.backup.Window_Message_isFastForward = Window_Message.prototype.isFastForward;
  } else {
    $.backup.Window_Message_isFastForward = function() {};
  };
  Window_Message.prototype.isFastForward = function() {
    return $.backup.Window_Message_isFastForward.call(this);
  };

  Window_Message.prototype.updateInput = function() {
    if (this.isAnySubWindowActive()) {
      return true;
    }
    if (this.isFastForward()) {
      if (this.pause) {
        if (!this._textState) {
          this.pause = false;
          this.terminateMessage();
        }
      } else if (this.pagePause) {
        this.pagePause = false;
        this.endPagePause();
      };
    };
    if (this.pause) {
      if (this.isTriggered()) {
        Input.update();
        this.pause = false;
        if (!this._textState) {
          this.terminateMessage();
        }
      }
      return true;
    } else if (this.pagePause) {
      if (this.isTriggered()) {
        Input.update();
        this.pagePause = false;
        this.endPagePause();
      }
      return true;
    };
    return false;
  };

  Window_Message.prototype.startPagePause = function() {
    this.startWait(10);
    this.pagePause = true;
    this.downArrowVisible = true;
  };

  Window_Message.prototype.endPagePause = function() {
    if (this.needsNewPage(this._textState)) {
      this.startScrollContents();
    } else {
      this.downArrowVisible = false;
    };
  };

  Window_Message.prototype.startScrollContents = function() {
    this.needScrollContents = true;

    this.scrollContentsLeftFrames = 20;
    this.scrollContentsTotalFrames = 20;

    if (this.isFastForward()) {
      this.scrollContentsLeftFrames = 1;
      this.scrollContentsTotalFrames = 1;
    }
  };

  Window_Message.prototype._updateScrollContents = function() {
    if (this.needScrollContents) {
      this.scrollContentsLeftFrames--;
      if (this.scrollContentsLeftFrames < 0) {
        this.downArrowVisible = false;
        if (!this.isFastForward()) {
          if (this.scrollContentsLeftFrames <= -5) {
            this._endScrollContents();
            return true;
          } else {
            return false;
          }
        } else {
          this._endScrollContents();
          return true;
        }
      };
      var newHeight = this.contents.height * this.scrollContentsLeftFrames / this.scrollContentsTotalFrames;
      this.origin.y = this.contents.height - newHeight;
      return false;
    };
    return true;
  };

  Window_Message.prototype._endScrollContents = function() {
    this.origin.y = 0;
    this.newPage(this._textState);
    this.needScrollContents = false;
  }

  Window_Message.prototype.updateMessage = function() {
    if (this._textState) {
      while (!this.isEndOfText(this._textState)) {
        // if (this.needsNewPage(this._textState)) {
        //   this.newPage(this._textState);
        //   break;
        // }
        this.updateShowFast();
        this.processCharacter(this._textState);
        if (!this._showFast && !this._lineShowFast) {
          break;
        }
        if (this.pause || this._waitCount > 0) {
          break;
        }
      }
      if (this.isEndOfText(this._textState)) {
        this.onEndOfText();
      }
      return true;
    } else {
      return false;
    }
  };

})(TWDP.SME);
