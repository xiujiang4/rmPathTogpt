//=============================================================================
// RPG Maker MV QJ-PathFinder.js
//=============================================================================
/*:
 * @target MV MZ
 * @plugindesc 新-正式-寻路插件 [1.5]
 * @author Qiu Jiu
 * @help
 *
 * ================================================================
 * 使用介绍：
 * ================================================================
 * 1.在移动路线中的“脚本”中写如下脚本：
 *   (1) 向指定点移动一格：
 *       this.fpXy(tarX,tarY)
 *       this.fpXy(tarX,tarY,range)
 *       this.fpXy(tarX,tarY,range,showTrace)
 *
 *       range:默认为1。与指定点间的距离小于等于range(格)时不移动。。
 *          例如写0时会移动到指定点上，写1时会移动到指定点附近一格上。
 *       showTrace:默认为false。写true时，该事件每进行一次寻路，都会在地图上显示出路径的格子图。方便检查。
 *          同时只能有一个事件的寻路的showTrace为true。此图仅用于测试，在正式游戏中建议关闭。
 *
 *   (2) 向指令事件/玩家移动一格：
 *       this.fpChar(characterId)
 *       this.fpChar(characterId,range)
 *       this.fpChar(characterId,range,showTrace)
 *
 *       characterId:写-1时代表玩家，写大于0的数字代表指定事件。写其余数字无效。
 *
 * 2.虽然第0个和MV原本的寻路一样都是A*算法，但是通过预处理和数据再利用，其运算效率比MV
 *   原有的寻路要快很多。可以支持比较大的地图和特别复杂地图的寻路。
 *
 * 3.此插件提供了一个完整的综合性函数，但是使用起来可能略有难度,只针对特殊用途。
 *   在移动路线中的“脚本”中写如下指令:
 *
 *   this.pathFinderXy(startX,startY,endX,endY,{})
 *   {}是一个对象，其中可以写的属性有：
 *
 *   range                     :写数字，代表当前角色要移动到目标角色的多少范围内
 *   maxLength                 :写数字，代表最大寻路范围
 *   showTrace                 :写布尔值，代表是否显示轨迹
 *   move                      :写布尔值。此值为真时当前角色会移动，写false时当前角色不会移动，但是此函数的返回值是当前角色寻到的路的朝向
 *   dia                       :写布尔值，代表是否斜向移动
 *
 *   
 *   在执行这条语句之后，可以在脚本或者条件分歧中使用
 *   this.character(characterId).pathFinderSucceed()
 *   来判断寻路是否成功(返回一个布尔值)。
 *   只有当寻路完全通通畅时才算寻路成功。
 *   要注意，这里的this.character(characterId)要和上面的“移动路线”中指定的移动的角色要相同。
 *
 * 4.注意！插件参数中的“玩家斜向移动”不是指完全地让玩家斜向移动。
 *   您想让玩家斜向移动得用其他插件，插件参数中的“玩家斜向移动”只是指当您点击鼠标来让玩家移动的时候，是否玩家会
 *   主动进行斜向移动寻路。
 *
 * ================================================================
 *
 * @param l1
 * @text 玩家点击寻路
 *
 * @param findDirectionTo
 * @text 玩家点击寻路
 * @desc 是否在鼠标点击地图时也使用寻路插件进行寻路
 * @type boolean
 * @default true
 * @parent l1
 *
 * @param findDirectionToImg
 * @text 玩家寻路轨迹显示
 * @desc 是否在鼠标点击地图进行寻路时显示轨迹
 * @type boolean
 * @default false
 * @parent l1
 *
 * @param playerDiaMove
 * @text 玩家寻路斜向移动
 * @desc 玩家寻路时是否可斜向移动
 * @type boolean
 * @default true
 * @parent l1
 *
 * @param playerMaxLength
 * @text 玩家寻路移动最大移动距离
 * @desc 玩家寻路移动最大移动距离
 * @type number
 * @default 24
 * @parent l1
 *
 * @param l2
 * @text 默认设置
 *
 * @param defaultDiaMove
 * @text 默认斜向移动
 * @desc 默认情况下是否斜向移动
 * @type boolean
 * @default false
 * @parent l2
 *
 * @param defaultMaxLength
 * @text 默认最大移动距离
 * @desc 默认情况下的最大移动距离
 * @type number
 * @default 20
 * @parent l2
 *
 *
 *
 *
 *
*/
//=============================================================================
//
//=============================================================================
var QJ = QJ || {};
QJ.PFEX = QJ.PFEX || {};
var Imported = Imported || {};
Imported.QJPathFinder = true;
//=============================================================================
//
//=============================================================================
(($ = {}) => {
//=============================================================================
//
//=============================================================================
const pluginName = "QJ-PathFinder";
const parameters = PluginManager.parameters(pluginName);
const findDirectionTo = eval(parameters["findDirectionTo"]);
const findDirectionToImg = eval(parameters["findDirectionToImg"]);
const defaultDiaMove = eval(parameters["defaultDiaMove"]);
const defaultMaxLength = eval(parameters["defaultMaxLength"]);
const playerMaxLength = eval(parameters["playerMaxLength"]);
const playerDiaMove = eval(parameters["playerDiaMove"]);
const tileSize = 48;
//=============================================================================
//
//=============================================================================
function AStarFinder(opt) {
    this.initialize(opt = opt || {});
}
function PathFinderNode(x, y, walkable) {
    this.x = x;
    this.y = y;
    this.walkable = walkable;
}
function PathFinderGrid(width_or_matrix, height, matrix) {
    this.initialize(width_or_matrix, height, matrix);
}
const PathFinderUtil = (()=>{
    let $ = {};
    $.backtrace = function(node) {
        var path = [[node.x, node.y]];
        while (node.parent) {
            node = node.parent;
            path.push([node.x, node.y]);
        }
        return path.reverse();
    }
    $.biBacktrace = function(nodeA, nodeB) {
        var pathA = backtrace(nodeA),
            pathB = backtrace(nodeB);
        return pathA.concat(pathB.reverse());
    }
    $.pathLength = function(path) {
        var i, sum = 0, a, b, dx, dy;
        for (i = 1; i < path.length; ++i) {
            a = path[i - 1];
            b = path[i];
            dx = a[0] - b[0];
            dy = a[1] - b[1];
            sum += Math.sqrt(dx * dx + dy * dy);
        }
        return sum;
    }
    $.interpolate = function(x0, y0, x1, y1) {
        var abs = Math.abs,line = [],sx, sy, dx, dy, err, e2;
        dx = abs(x1 - x0);
        dy = abs(y1 - y0);
        sx = (x0 < x1) ? 1 : -1;
        sy = (y0 < y1) ? 1 : -1;
        err = dx - dy;
        while (true) {
            line.push([x0, y0]);
            if (x0 === x1 && y0 === y1) break;
            e2 = 2 * err;
            if (e2 > -dy) {
                err = err - dy;
                x0 = x0 + sx;
            }
            if (e2 < dx) {
                err = err + dx;
                y0 = y0 + sy;
            }
        }
        return line;
    }
    $.expandPath = function(path) {
        var expanded = [],len = path.length,coord0, coord1,interpolated,interpolatedLen,i, j;
        if (len < 2) return expanded;
        for (i = 0; i < len - 1; ++i) {
            coord0 = path[i];
            coord1 = path[i + 1];
    
            interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
            interpolatedLen = interpolated.length;
            for (j = 0; j < interpolatedLen - 1; ++j) {
                expanded.push(interpolated[j]);
            }
        }
        expanded.push(path[len - 1]);
        return expanded;
    }
    $.smoothenPath = function(grid, path) {
        var len = path.length,
            x0 = path[0][0],        // path start x
            y0 = path[0][1],        // path start y
            x1 = path[len - 1][0],  // path end x
            y1 = path[len - 1][1],  // path end y
            sx, sy,                 // current start coordinate
            ex, ey,                 // current end coordinate
            newPath,
            i, j, coord, line, testCoord, blocked;
        sx = x0;
        sy = y0;
        newPath = [[sx, sy]];
        for (i = 2; i < len; ++i) {
            coord = path[i];
            ex = coord[0];
            ey = coord[1];
            line = interpolate(sx, sy, ex, ey);
            blocked = false;
            for (j = 1; j < line.length; ++j) {
                testCoord = line[j];
                if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) {
                lastValidCoord = path[i - 1];
                newPath.push(lastValidCoord);
                sx = lastValidCoord[0];
                sy = lastValidCoord[1];
            }
        }
        newPath.push([x1, y1]);
        return newPath;
    }
    $.compressPath = function(path) {
        if(path.length < 3) return path;
        var compressed = [],
            sx = path[0][0], // start x
            sy = path[0][1], // start y
            px = path[1][0], // second point x
            py = path[1][1], // second point y
            dx = px - sx, // direction between the two points
            dy = py - sy, // direction between the two points
            lx, ly,
            ldx, ldy,
            sq, i;
        sq = Math.sqrt(dx*dx + dy*dy);
        dx /= sq;
        dy /= sq;
        compressed.push([sx,sy]);
        for(i = 2; i < path.length; i++) {
            lx = px;
            ly = py;
            ldx = dx;
            ldy = dy;
            px = path[i][0];
            py = path[i][1];
            dx = px - lx;
            dy = py - ly;
            sq = Math.sqrt(dx*dx + dy*dy);
            dx /= sq;
            dy /= sq;
            if ( dx !== ldx || dy !== ldy ) {
                compressed.push([lx,ly]);
            }
        }
        compressed.push([px,py]);
        return compressed;
    }
    return $;
})();
const PathFinderHeuristic = (()=>{
    let $ = {};
    $.manhattan=function(dx, dy) {
        return dx + dy;
    }
    $.euclidean=function(dx, dy) {
        return Math.sqrt(dx * dx + dy * dy);
    }
    $.octile=function(dx, dy) {
        var F = Math.SQRT2 - 1;
        return (dx < dy) ? F * dx + dy : F * dy + dx;
    }
    $.chebyshev=function(dx, dy) {
        return Math.max(dx, dy);
    }
    return $;
})();
//=============================================================================
//
//=============================================================================
let Heap = QJ.Heap?QJ.Heap:(()=>{
    let floor = Math.floor,min = Math.min;
    let insort = function(a, x, lo, hi, cmp) {
      let mid;
      if (lo == null) lo = 0;
      if (lo < 0) throw new Error('lo must be non-negative');
      if (hi == null) hi = a.length;
      while (lo < hi) {
        mid = floor((lo + hi) / 2);
        if (cmp(x, a[mid]) < 0) hi = mid;
        else lo = mid + 1;
      }
      return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
    },heappush = function(array, item, cmp) {
      array.push(item);
      return _siftdown(array, 0, array.length - 1, cmp);
    },heappop = function(array, cmp) {
      var lastelt, returnitem;
      lastelt = array.pop();
      if (array.length) {
        returnitem = array[0];
        array[0] = lastelt;
        _siftup(array, 0, cmp);
      } else {
        returnitem = lastelt;
      }
      return returnitem;
    },heapreplace = function(array, item, cmp) {
      var returnitem;
      returnitem = array[0];
      array[0] = item;
      _siftup(array, 0, cmp);
      return returnitem;
    },heappushpop = function(array, item, cmp) {
      var _ref;
      if (array.length && cmp(array[0], item) < 0) {
        _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
        _siftup(array, 0, cmp);
      }
      return item;
    },heapify = function(array, cmp) {
      var i, _i, _j, _len, _ref, _ref1, _results, _results1;
      _ref1 = (function() {
        _results1 = [];
        for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
        return _results1;
      }).apply(this).reverse();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        i = _ref1[_i];
        _results.push(_siftup(array, i, cmp));
      }
      return _results;
    },updateItem = function(array, item, cmp) {
      var pos = array.indexOf(item);
      if (pos === -1) return;
      _siftdown(array, 0, pos, cmp);
      return _siftup(array, pos, cmp);
    },nlargest = function(array, n, cmp) {
      var elem, result, _i, _len, _ref;
      result = array.slice(0, n);
      if (!result.length) return result;
      heapify(result, cmp);
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        heappushpop(result, elem, cmp);
      }
      return result.sort(cmp).reverse();
    },nsmallest = function(array, n, cmp) {
      var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
      if (n * 10 <= array.length) {
        result = array.slice(0, n).sort(cmp);
        if (!result.length) return result;
        los = result[result.length - 1];
        _ref = array.slice(n);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          elem = _ref[_i];
          if (cmp(elem, los) < 0) {
            insort(result, elem, 0, null, cmp);
            result.pop();
            los = result[result.length - 1];
          }
        }
        return result;
      }
      heapify(array, cmp);
      _results = [];
      for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        _results.push(heappop(array, cmp));
      }
      return _results;
    },_siftdown = function(array, startpos, pos, cmp) {
      var newitem, parent, parentpos;
      newitem = array[pos];
      while (pos > startpos) {
        parentpos = (pos - 1) >> 1;
        parent = array[parentpos];
        if (cmp(newitem, parent) < 0) {
          array[pos] = parent;
          pos = parentpos;
          continue;
        }
        break;
      }
      return array[pos] = newitem;
    },_siftup = function(array, pos, cmp) {
      var childpos, endpos, newitem, rightpos, startpos;
      endpos = array.length;
      startpos = pos;
      newitem = array[pos];
      childpos = 2 * pos + 1;
      while (childpos < endpos) {
        rightpos = childpos + 1;
        if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
          childpos = rightpos;
        }
        array[pos] = array[childpos];
        pos = childpos;
        childpos = 2 * pos + 1;
      }
      array[pos] = newitem;
      return _siftdown(array, startpos, pos, cmp);
    };
    function Heap(cmp) {
      this.cmp = cmp;
      this.nodes = [];
    }
    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };
    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };
    Heap.prototype.peek = function() {
      return this.nodes[0];
    };
    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };
    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };
    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };
    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };
    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };
    Heap.prototype.clear = function() {
      return this.nodes = [];
    };
    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };
    Heap.prototype.size = function() {
      return this.nodes.length;
    };
    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };
    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };
    Heap.prototype.insert = Heap.prototype.push;
    Heap.prototype.top = Heap.prototype.peek;
    Heap.prototype.front = Heap.prototype.peek;
    Heap.prototype.has = Heap.prototype.contains;
    Heap.prototype.copy = Heap.prototype.clone;
    Heap.push = heappush;
    Heap.pop = heappop;
    Heap.replace = heapreplace;
    Heap.pushpop = heappushpop;
    Heap.heapify = heapify;
    Heap.updateItem = updateItem;
    Heap.nlargest = nlargest;
    Heap.nsmallest = nsmallest;
    return Heap;
})();;
//=====================================================
let DiagonalMovement = {
    Always: 1,
    Never: 2,
    IfAtMostOneObstacle: 3,
    OnlyWhenNoObstacles: 4
};
//=====================================================
//=============================================================================
//
//=============================================================================
PathFinderGrid.prototype.initialize = function(width_or_matrix,height,matrix) {
    let width;
    if (typeof width_or_matrix !== 'object') {
        width = width_or_matrix;
    } else {
        height = width_or_matrix.length;
        width = width_or_matrix[0].length;
        matrix = width_or_matrix;
    }
    this.width = width;
    this.height = height;
    this.nodes = this._buildNodes(width, height, matrix);
}
PathFinderGrid.prototype._buildNodes = function(width, height, matrix) {
    let i, j, a = Array, nodes = new a(height);
    let n = PathFinderNode;
    if (matrix) {
        for (i = 0; i < height; ++i) {
            nodes[i] = new a(width);
            for (j = 0; j < width; ++j) {
                nodes[i][j] = new n(j, i, !matrix[i][j]);
            }
        }
    } else {
        for (i = 0; i < height; ++i) {
            nodes[i] = new a(width);
            for (j = 0; j < width; ++j) {
                nodes[i][j] = new n(j, i, true);
            }
        }
    }
    return nodes;
};
PathFinderGrid.prototype.getNodeAt = function(x, y) {
    return this.nodes[y][x];
};
PathFinderGrid.prototype.isWalkableAt = function(x, y) {
    return this.isInside(x, y) && this.nodes[y][x].walkable;
};
PathFinderGrid.prototype.isInside = function(x, y) {
    return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
};
PathFinderGrid.prototype.setWalkableAt = function(x, y, walkable) {
    this.nodes[y][x].walkable = walkable;
};
/**
 * Get the neighbors of the given node.
 *
 *     offsets      diagonalOffsets:
 *  +---+---+---+    +---+---+---+
 *  |   | 0 |   |    | 0 |   | 1 |
 *  +---+---+---+    +---+---+---+
 *  | 3 |   | 1 |    |   |   |   |
 *  +---+---+---+    +---+---+---+
 *  |   | 2 |   |    | 3 |   | 2 |
 *  +---+---+---+    +---+---+---+
 *
 *  When allowDiagonal is true, if offsets[i] is valid, then
 *  diagonalOffsets[i] and
 *  diagonalOffsets[(i + 1) % 4] is valid.
 * @param {Node} node
 * @param {DiagonalMovement} diagonalMovement
 */
PathFinderGrid.prototype.getNeighbors = function(node, diagonalMovement) {
    let x = node.x, y = node.y, neighbors = [], nodes = this.nodes;
    let s0 = false, d0 = false, s1 = false, d1 = false, s2 = false, d2 = false, s3 = false, d3 = false;
    // ↑ → ↓ ←
    if (this.isWalkableAt(x, y - 1)) {
        neighbors.push(nodes[y - 1][x]);
        s0 = true;
    }
    if (this.isWalkableAt(x + 1, y)) {
        neighbors.push(nodes[y][x + 1]);
        s1 = true;
    }
    if (this.isWalkableAt(x, y + 1)) {
        neighbors.push(nodes[y + 1][x]);
        s2 = true;
    }
    if (this.isWalkableAt(x - 1, y)) {
        neighbors.push(nodes[y][x - 1]);
        s3 = true;
    }
    if (diagonalMovement === DiagonalMovement.Never) {
        return neighbors;
    }
    if (diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
        d0 = s3 && s0;
        d1 = s0 && s1;
        d2 = s1 && s2;
        d3 = s2 && s3;
    } else if (diagonalMovement === DiagonalMovement.IfAtMostOneObstacle) {
        d0 = s3 || s0;
        d1 = s0 || s1;
        d2 = s1 || s2;
        d3 = s2 || s3;
    } else if (diagonalMovement === DiagonalMovement.Always) {
        d0 = true;
        d1 = true;
        d2 = true;
        d3 = true;
    } else {
        throw new Error('Incorrect value of diagonalMovement');
    }
    // ↖ ↗ ↘ ↙
    if (d0 && this.isWalkableAt(x - 1, y - 1)) {
        neighbors.push(nodes[y - 1][x - 1]);
    }
    if (d1 && this.isWalkableAt(x + 1, y - 1)) {
        neighbors.push(nodes[y - 1][x + 1]);
    }
    if (d2 && this.isWalkableAt(x + 1, y + 1)) {
        neighbors.push(nodes[y + 1][x + 1]);
    }
    if (d3 && this.isWalkableAt(x - 1, y + 1)) {
        neighbors.push(nodes[y + 1][x - 1]);
    }
    return neighbors;
};
PathFinderGrid.prototype.clone = function() {
    let i, j, width = this.width, height = this.height, thisNodes = this.nodes;
    let newGrid = new PathFinderGrid(width, height);
    let a = Array;
    let newNodes = new a(height);
    let n = PathFinderNode;
    for (i = 0; i < height; ++i) {
        newNodes[i] = new a(width);
        for (j = 0; j < width; ++j) {
            newNodes[i][j] = new n(j, i, thisNodes[i][j].walkable);
        }
    }
    newGrid.nodes = newNodes;
    return newGrid;
};
//=====================================================
AStarFinder.prototype.initialize = function(opt) {
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.heuristic = opt.heuristic || PathFinderHeuristic.manhattan;
    this.weight = opt.weight || 1;
    this.diagonalMovement = opt.diagonalMovement;
    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }
    // When diagonal movement is allowed the manhattan heuristic is not
    //admissible. It should be octile instead
    if (this.diagonalMovement === DiagonalMovement.Never) {
        this.heuristic = opt.heuristic || PathFinderHeuristic.manhattan;
    } else {
        this.heuristic = opt.heuristic || PathFinderHeuristic.octile;
    }
};
AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid ,extraData = {}) {
    this.canArrive = false;
    var openList = new Heap(function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        }),
        startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        heuristic = this.heuristic,
        diagonalMovement = this.diagonalMovement,
        weight = this.weight,
        abs = Math.abs, SQRT2 = Math.SQRT2,
        node, neighbors, neighbor, i, l, x, y, ng;
    var maxJudgeRange = extraData.maxLength || 256;
    // set the `g` and `f` value of the start node to be 0
    startNode.g = 0;
    startNode.f = 0;
    // push the start node into the open list
    openList.push(startNode);
    startNode.opened = true;

    let xa = startX - endX,ya = startY - endY;
    let minNode = startNode,minM = xa*xa+ya*ya;

    // while the open list is not empty
    while (!openList.empty()) {
        // pop the position of node which has the minimum `f` value.
        node = openList.pop();
        node.closed = true;

        // if reached the end position, construct the path and return it
        if (node === endNode) {
            this.canArrive = true;
            this.realTarget = [node.x,node.y];
            return PathFinderUtil.backtrace(endNode);
        }

        // get neigbours of the current node
        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }

            x = neighbor.x;
            y = neighbor.y;

            if (abs(x-startX)>maxJudgeRange||abs(y-startY)>maxJudgeRange) {
                neighbor.closed = true;
                continue;
            }
            // get the distance between current node and the neighbor
            // and calculate the next g score
            ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

            // check if the neighbor has not been inspected yet, or
            // can be reached with smaller cost from the current node
            if (!neighbor.opened || ng < neighbor.g) {

                xa = abs(x - endX);
                ya = abs(y - endY);

                neighbor.g = ng;
                neighbor.h = neighbor.h || weight * heuristic(xa,ya);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = node;

                neighbor.m = neighbor.m || xa*xa+ya*ya;
                if (neighbor.m<minM) {
                    minM = neighbor.m;
                    minNode = neighbor;
                }

                if (!neighbor.opened) {
                    openList.push(neighbor);
                    neighbor.opened = true;
                } else {
                    // the neighbor can be reached with smaller cost.
                    // Since its f value has been updated, we have to
                    // update its position in the open list
                    openList.updateItem(neighbor);
                }
            }
        } // end for each neighbor
    } // end while not open list empty
    // fail to find the path
    if (minNode) {
        this.realTarget = [minNode.x,minNode.y];
        return PathFinderUtil.backtrace(minNode);
    } else {
        return [];
    }
};
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//Game_Map
//=============================================================================
QJ.PFEX.map = null;
QJ.PFEX.mapOrgin = null;
QJ.PFEX.finder = null;
QJ.PFEX.finderDia = null;
$.Game_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
    $.Game_Map_setup.apply(this,arguments);
    this.reloadMapGridData();
};
$.Game_Map_update = Game_Map.prototype.update;
Game_Map.prototype.update = function(sceneActive) {
    if (sceneActive) this.updateMapGridPF();
    $.Game_Map_update.call(this,sceneActive);
};
Game_Map.prototype.canvasToGridX = function(x) {
    return Math.round(x);
};
Game_Map.prototype.canvasToGridY = function(y) {
    return Math.round(y);
};
Game_Map.prototype.reloadMapGridData = function() {
    let mapData = new Array();
    let d2,d4,d6,d8;
    for (let j=0,jl=this.height();j<jl;j++) {
        mapData[j] = new Array();
        for (let i=0,il=this.width();i<il;i++) {
            d2 = this.isPassable(i,j,2);
            d4 = this.isPassable(i,j,4);
            d6 = this.isPassable(i,j,6);
            d8 = this.isPassable(i,j,8);
            mapData[j][i] = d2&&d4&&d6&&d8?0:1;
        }
    }
    QJ.PFEX.mapOrgin = new PathFinderGrid(mapData);
    QJ.PFEX.finder = new AStarFinder({
        dontCrossCorners:true,
        allowDiagonal:false
    });
    QJ.PFEX.finderDia = new AStarFinder({
        dontCrossCorners:true,
        allowDiagonal:true
    });
};
Game_Map.prototype.updateMapGridPF = function() {
    let statusOK = true;
    while(statusOK) {
        try {
            if (!QJ.PFEX.mapOrgin) this.reloadMapGridData();
            let newMap = QJ.PFEX.map = QJ.PFEX.mapOrgin.clone(),x,y;
            for (let i of this._events) {
                if (i&&i._pageIndex>-1&&!i.isThrough()) {
                    x = this.canvasToGridX(i.x);
                    y = this.canvasToGridX(i.y);
                    if (this.isValid(x,y)) {
                        newMap.setWalkableAt(x,y,false);
                    }
                }
            }
            statusOK = false;
        } catch(e) {
            statusOK = true;
            QJ.PFEX.mapOrgin = null;
        }
    }

};
//=============================================================================
//Game_Character
//=============================================================================
Game_Character.prototype.pointToMovenPF = function(orginXy,tarXy) {
    if (tarXy[0]>orginXy[0]&&tarXy[1]>orginXy[1]) this.moveDiagonally(6,2);
    else if (tarXy[0]>orginXy[0]&&tarXy[1]==orginXy[1]) this.moveStraight(6);
    else if (tarXy[0]>orginXy[0]&&tarXy[1]<orginXy[1]) this.moveDiagonally(6,8);
    else if (tarXy[0]==orginXy[0]&&tarXy[1]>orginXy[1]) this.moveStraight(2);
    else if (tarXy[0]==orginXy[0]&&tarXy[1]==orginXy[1]) {}
    else if (tarXy[0]==orginXy[0]&&tarXy[1]<orginXy[1]) this.moveStraight(8);
    else if (tarXy[0]<orginXy[0]&&tarXy[1]>orginXy[1]) this.moveDiagonally(4,2);
    else if (tarXy[0]<orginXy[0]&&tarXy[1]==orginXy[1]) this.moveStraight(4);
    else if (tarXy[0]<orginXy[0]&&tarXy[1]<orginXy[1]) this.moveDiagonally(4,8);
};
Game_Character.prototype.pointToDirectionPF = function(orginXy,tarXy) {
    if (tarXy[0]>orginXy[0]&&tarXy[1]>orginXy[1]) return 3;
    else if (tarXy[0]>orginXy[0]&&tarXy[1]==orginXy[1]) return 6;
    else if (tarXy[0]>orginXy[0]&&tarXy[1]<orginXy[1]) return 9;
    else if (tarXy[0]==orginXy[0]&&tarXy[1]>orginXy[1]) return 2;
    else if (tarXy[0]==orginXy[0]&&tarXy[1]==orginXy[1]) return 5;
    else if (tarXy[0]==orginXy[0]&&tarXy[1]<orginXy[1]) return 8;
    else if (tarXy[0]<orginXy[0]&&tarXy[1]>orginXy[1]) return 1;
    else if (tarXy[0]<orginXy[0]&&tarXy[1]==orginXy[1]) return 4;
    else if (tarXy[0]<orginXy[0]&&tarXy[1]<orginXy[1]) return 7;
};
Game_Character.prototype.turnTowardPointPF = function(x,y) {
    var sx = this.deltaXFrom(x);
    var sy = this.deltaYFrom(y);
    if (Math.abs(sx) > Math.abs(sy)) {
        this.setDirection(sx > 0 ? 4 : 6);
    } else if (sy !== 0) {
        this.setDirection(sy > 0 ? 8 : 2);
    }
};
//=============================================================================
//
//=============================================================================
$.Game_Character_update = Game_Character.prototype.update;
Game_Character.prototype.update = function() {
    $.Game_Character_update.apply(this,arguments);
    if (this._pathFinderCoolCount>0) {
        this._pathFinderCoolCount--;
    }
}
//=============================================================================
//
//=============================================================================
Game_Character.prototype.pathFinderXy = function(startX,startY,tarX,tarY,extraData) {
    //================================================
    let range = (!(extraData.range>=0)) ? 1 : extraData.range;
    let maxLength = (!(extraData.maxLength))>=1 ? defaultMaxLength : extraData.maxLength;
    let showTrace = extraData.showTrace == null? false : extraData.showTrace;
    let move = extraData.move == null? true : extraData.move;
    let dia = extraData.dia == null? defaultDiaMove : extraData.dia;
    if (move&&this._pathFinderCoolCount>0) return;
    if (this.isMoving()) return 0;
    //================================================
    tarX = $gameMap.canvasToGridX(tarX);
    tarY = $gameMap.canvasToGridY(tarY);
    startX = $gameMap.canvasToGridX(startX);
    startY = $gameMap.canvasToGridY(startY);
    let w = $gameMap.width();
    let h = $gameMap.height();
    if (tarX<0||tarY<0||tarX>=w||tarY>=h) return 0;
    //================================================
    let distance = (startX-tarX)*(startX-tarX)+(startY-tarY)*(startY-tarY);
    if (distance<=range*range) return 0;
    if (distance>=maxLength*maxLength) return 0;
    //================================================
    let gridData = QJ.PFEX.map.clone();
    if (this==$gamePlayer) {
        for (let i of $gameMap._events) {
            if (i&&!i.isNormalPriority()) {
                x = $gameMap.canvasToGridX(i.x);
                y = $gameMap.canvasToGridX(i.y);
                if ($gameMap.isValid(x,y)) {
                    gridData.setWalkableAt(x,y,true);
                }
            }
        }
    }
    gridData.setWalkableAt(startX,startY,true);//无论何如保证起始点可通行
    //================================================
    //console.time("test");
    let pathFinder = dia?QJ.PFEX.finderDia:QJ.PFEX.finder;
    let path = pathFinder.findPath(startX,startY,tarX,tarY,gridData,{maxLength:maxLength});
    this._pathFinderSucceed = pathFinder.canArrive;
    this._pathFinderRealTarget = pathFinder.realTarget;
    //console.timeEnd("test");
    if (showTrace) {
        let traceSprite = QJ.PFEX.findSprite();
        traceSprite.clearPoint();
        for (let i in path) {
            traceSprite.drawPoint(path[i][0],path[i][1],"#000000",i);
        }
    }
    if (path.length<=1) {
        this.moveTowardXyPF(tarX,tarY);
        this._pathFinderCoolCount = 60;
        return 0;
    } else {
        if (move) {
            this.pointToMovenPF([startX,startY],path[1]);
            return 1;
        } else {
            return this.pointToDirectionPF([startX,startY],path[1]);
        }
    }
    //================================================
};
Game_Character.prototype.fpXy = function(tarX,tarY,range,showTrace = false,move = true,maxLength = 0) {
    return this.pathFinderXy(this.x,this.y,tarX,tarY,{showTrace:showTrace,range:range,maxLength:maxLength});
};
Game_Character.prototype.pathFinderChar = function(characterId,range,showTrace,maxLength,move) {
    if (characterId==-1) characterId = $gamePlayer;
    else if (characterId>0) characterId = $gameMap.event(characterId);
    else return;//throw new Error("fpChar指令中的角色编号characterId错误，必须是负一或者大于零的数字。");
    this.pathFinderXy(this.x,this.y,characterId.x,characterId.y,{
        range:range,
        showTrace:showTrace,
        maxLength:maxLength,
        move:move
    });
};
Game_Character.prototype.fpChar = function(character,range,showTrace = false,move = true,maxLength = 0) {
    return this.pathFinderChar(character,range,showTrace,maxLength,move);
};
//=============================================================================
//
//=============================================================================
Game_Character.prototype.pathFinderSucceed = function() {
    return !!this._pathFinderSucceed;
};
//=============================================================================
//
//=============================================================================
Game_Character.prototype.moveTowardXyPF = function(x,y) {
    const sx = this.deltaXFrom(x);
    const sy = this.deltaYFrom(y);
    if (Math.abs(sx) > Math.abs(sy)) {
        this.moveStraight(sx > 0 ? 4 : 6);
        if (!this.isMovementSucceeded() && sy !== 0) {
            this.moveStraight(sy > 0 ? 8 : 2);
        }
    } else if (sy !== 0) {
        this.moveStraight(sy > 0 ? 8 : 2);
        if (!this.isMovementSucceeded() && sx !== 0) {
            this.moveStraight(sx > 0 ? 4 : 6);
        }
    }
};
Game_Character.prototype.moveTowardCharacterPF = function(character) {
    this.moveTowardXyPF(character.x,character.y);
};
//=============================================================================
//findDirectionTo
//=============================================================================
if (findDirectionTo) {
    Game_Player.prototype.findDirectionTo = function(goalX, goalY) {
        let data = this._tempRemFDData,dir;
        if (this._tempRemFDData) {
            if (data.remX!=goalX||data.remY!=goalY) {
                dir = this.pathFinderXy(this.x,this.y,goalX,goalY,{
                    showTrace:findDirectionToImg,
                    move:false,
                    range:0,
                    dia:playerDiaMove,
                    maxLength:playerMaxLength
                });
                data.x = this._pathFinderRealTarget[0];
                data.y = this._pathFinderRealTarget[1];
                data.remX = goalX;
                data.remY = goalY;
                //console.log("reset",data);
            } else {
                if (this.x === data.x && this.y === data.y) {
                    this.turnTowardPointPF(goalX,goalY);
                } else {
                    dir = this.pathFinderXy(this.x,this.y,data.x,data.y,{
                        showTrace:findDirectionToImg,
                        move:false,
                        range:0,
                        dia:playerDiaMove,
                        maxLength:playerMaxLength
                    });
                }
                //console.log("update",data);
            }
        } else {
            data = this._tempRemFDData = {};
            dir = this.pathFinderXy(this.x,this.y,goalX,goalY,{
                showTrace:findDirectionToImg,
                move:false,
                range:0,
                dia:playerDiaMove,
                maxLength:playerMaxLength
            });
            data.x = this._pathFinderRealTarget[0];
            data.y = this._pathFinderRealTarget[1];
            data.remX = goalX;
            data.remY = goalY;
        }
        if (playerDiaMove) {
            //nothing
        } else {
            if ([1,3,7,9].includes(dir)) {
                dir = 0;
            }
        }
        return dir;
    };
}
if (playerDiaMove) {
    Game_Player.prototype.executeMove = function(direction) {
        if (direction%2==0) this.moveStraight(direction);
        else if (direction==1) this.moveDiagonally(4,2);
        else if (direction==3) this.moveDiagonally(6,2);
        else if (direction==7) this.moveDiagonally(4,8);
        else if (direction==9) this.moveDiagonally(6,8);
    };
}
//=============================================================================
//
//=============================================================================
QJ.PFEX.findSprite = function() {
    if (SceneManager._scene&&SceneManager._scene._spriteset) {
        return SceneManager._scene._spriteset.getPathFinderSprite();
    } else {
        return null;
    }
}
//=============================================================================
//Spriteset_Map
//=============================================================================
Spriteset_Map.prototype.getPathFinderSprite = function() {
    if (!this._pathFinderSprite) {
        this._pathFinderSprite = new Sprite_PathFinder();
        this._tilemap.addChild(this._pathFinderSprite);
    }
    return this._pathFinderSprite;
};
//=============================================================================
//Sprite_PathFinder
//=============================================================================
function Sprite_PathFinder() {
    this.initialize.apply(this, arguments);
}
Sprite_PathFinder.prototype = Object.create(Sprite.prototype);
Sprite_PathFinder.prototype.constructor = Sprite_PathFinder;
Sprite_PathFinder.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this.bitmap = new Bitmap($gameMap.width()*tileSize/3,$gameMap.height()*tileSize/3);
    this.bitmap.textColor = "#FFFF00";
    this.scale.x = 3;
    this.scale.y = 3;
};
Sprite_PathFinder.prototype.update = function() {
    Sprite.prototype.update.call(this);
    this.x = - $gameMap.displayX()*tileSize;
    this.y = - $gameMap.displayY()*tileSize;
};
Sprite_PathFinder.prototype.drawPoint = function(x,y,c,l) {
    this.bitmap.paintOpacity = 100;
    this.bitmap.fillRect(x*16,y*16,16,16,c);
    this.bitmap.paintOpacity = 200;
    this.bitmap.fontSize = 16;
    this.bitmap.drawText(l,x*16,y*16,16,16,"center");
};
Sprite_PathFinder.prototype.clearPoint = function() {
    this.bitmap.clear();
};
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
window["AStarFinder"] = AStarFinder;
window["PathFinderNode"] = PathFinderNode;
window["PathFinderGrid"] = PathFinderGrid;
window["PathFinderUtil"] = PathFinderUtil;
window["PathFinderHeuristic"] = PathFinderHeuristic;
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
//=============================================================================
//
//=============================================================================
})();
//=============================================================================
//
//=============================================================================