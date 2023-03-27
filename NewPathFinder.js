//=============================================================================
// NewPathFinder.js
//=============================================================================

/*:
 * @plugindesc Provides pathfinding functionality and allows for different pathfinding algorithms based on event notes. <mobile:num> can be used to indicate the algorithm, where num is the algorithm ID. Default is A* algorithm. 
 * @author 
 *
 * @help This plugin provides pathfinding functionality for RPG Maker MV and allows for different pathfinding algorithms based on event notes. By default, the plugin uses the A* algorithm for pathfinding. However, if the event note contains "<mobile:num>", where num is the algorithm ID, then the specified algorithm will be used for pathfinding.
 *
 * Plugin Commands:
 *   None
 *
 * Version:
 *   1.0.0 - initial release
 *
 * Terms of Use:
 *   This plugin is free for non-commercial and commercial use.
 */

var NewPathFinder = {};

NewPathFinder.findPath = function(startX, startY, endX, endY) {
    var algorithmId = 1; // default algorithm is A*
    if ($gameTemp.activeEvent() && $gameTemp.activeEvent().event().note.match(/<mobile:(\d+)>/i)) {
        algorithmId = parseInt(RegExp.$1);
    }
    var path = [];
    switch(algorithmId) {
        case 1:
            path = this.aStar(startX, startY, endX, endY);
            break;
        case 2:
            path = this.todo(startX, startY, endX, endY);
            break;
        default:
            path = this.aStar(startX, startY, endX, endY);
            break;
    }
    return path;
};

NewPathFinder.distance = function(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

NewPathFinder.getSurroundingNodes = function(node) {
    var nodes = [];
    nodes.push({x: node.x - 1, y: node.y - 1, cost: 1.4});
    nodes.push({x: node.x - 1, y: node.y, cost: 1});
    nodes.push({x: node.x - 1, y: node.y + 1, cost: 1.4});
    nodes.push({x: node.x, y: node.y - 1, cost: 1});
    nodes.push({x: node.x, y: node.y + 1, cost: 1});
    nodes.push({x: node.x + 1, y: node.y - 1, cost: 1.4});
    nodes.push({x: node.x + 1, y: node.y, cost: 1});
    nodes.push({x: node.x + 1, y: node.y + 1, cost: 1.4});
    return nodes;
};

NewPathFinder.getCost = function(currentNode, targetNode) {
    if (currentNode.x == targetNode.x || currentNode.y == targetNode.y) {
        return 1;
    } else {
        return 1.4;
    }
};

NewPathFinder.aStar = function(startX, startY, endX, endY) {
    var startNode = {x: startX, y: startY, f: 0, g: 0, h: 0, parent: null};
    var endNode = {x: endX, y: endY, f: 0, g: 0, h: 0, parent: null};
    var openList = [];
    var closedList = [];
    openList.push(startNode);

    while (openList.length > 0) {
        var currentNode = openList[0];
        var currentIndex = 0;
        for (var i = 0; i < openList.length; i++) {
            if (openList[i].f < currentNode.f) {
                currentNode = openList[i];
                currentIndex = i;
            }
        }

        openList.splice(currentIndex, 1);
        closedList.push(currentNode);

        if (currentNode.x == endNode.x && currentNode.y == endNode.y) {
            var path = [];
            var current = currentNode;
            while (current != null) {
                path.push({x: current.x, y: current.y});
                current = current.parent;
            }
            return path.reverse();
        }

        var surroundingNodes = NewPathFinder.getSurroundingNodes(currentNode);
        for (var j = 0; j < surroundingNodes.length; j++) {
            var neighborNode = surroundingNodes[j];

            if (neighborNode.x < 0 || neighborNode.x >= $dataMap.width ||
                neighborNode.y < 0 || neighborNode.y >= $dataMap.height) {
                continue;
            }

            if ($gameMap.checkPassage(neighborNode.x, neighborNode.y, 0x0f) &&
                !NewPathFinder.nodeInList(neighborNode, closedList)) {

                var gScore = currentNode.g + neighborNode.cost;
                var gScoreIsBest = false;
                var neighborNodeIsBetter = false;

                if (!NewPathFinder.nodeInList(neighborNode, openList)) {
                    neighborNode.h = NewPathFinder.distance(neighborNode.x, neighborNode.y, endNode.x, endNode.y);
                    gScoreIsBest = true;
                    openList.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    gScoreIsBest = true;
                }

                if (gScoreIsBest) {
                    neighborNode.parent = currentNode;
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                }
            }
        }
    }

    return [];
};

NewPathFinder.nodeInList = function(node, list) {
    for (var i = 0; i < list.length; i++) {
        if (node.x == list[i].x && node.y == list[i].y) {
            return true;
        }
    }
    return false;
};

NewPathFinder.todo = function(startX, startY, endX, endY) {
    // TODO algorithm implementation
    // ...
};

// Override RPG Maker MV's pathfinding function
Game_Character.prototype.findPathTo = function(goalX, goalY) {
    var startX = this.x;
    var startY = this.y;
    var path = NewPathFinder.findPath(startX, startY, goalX, goalY);
    if (path.length > 0) {
        this._path = path;
        this._pathIndex = 0;
        return true;
    } else {
        return false;
    }
};