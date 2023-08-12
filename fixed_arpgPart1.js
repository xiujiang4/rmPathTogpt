(function() {

    // 1. 创建一个函数来解析事件的备注数据
    var getRoleFromNote = function(note) {
        var match = note.match(/<role:(\d+)>/i);
        if (match) {
            return Number(match[1]);
        }
        return null;
    };

    // 2. 重写RPG Maker MV的事件初始化函数，来增加我们的自定义数据
    var _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);
        this.setupRoleData();
    };

    var getCustomPropertiesFromNote = function(note) {
        var properties = {};
        var regex = /<([^:>]+):([^:>]+)>/gi;
        var match;
    
        while (match = regex.exec(note)) {
            var key = match[1].toLowerCase();
            var value = isNaN(match[2]) ? match[2] : Number(match[2]);
            properties[key] = value;
        }
    
        return properties;
    };

    Game_Event.prototype.setupRoleData = function() {
        var roleId = getRoleFromNote(this.event().note);
        if (roleId !== null) {
            var enemy = $dataEnemies[roleId];
            if (enemy) {
                this._roleData = {
                    hp: enemy.params[0],  // HP
                    mp: enemy.params[1],  // MP
                    atk: enemy.params[2], // 攻击
                    def: enemy.params[3], // 防御
                    mat: enemy.params[4], // 魔法攻击
                    mdf: enemy.params[5], // 魔法防御
                    agi: enemy.params[6], // 敏捷
                    luk: enemy.params[7]  // 运气
                };
                // 提取hitRange
                var matchHitRange = enemy.note.match(/<hitRange:(\d+)>/i);
                if (matchHitRange) {
                this._roleData.hitRange = Number(matchHitRange[1]);
                } else {
                this._roleData.hitRange = 1; // 如果没有定义hitRange，则默认为1
                };

        // 从行动模式中提取技能列表
        this._roleData.skills = enemy.actions.map(function(action) {
            return {
                id: action.skillId,
                priority: action.rating // 这里使用数据库中的“优先级”字段
            };
        });

        // 按优先级排序技能
        this._roleData.skills.sort((a, b) => b.priority - a.priority);

    
    
                // 将自定义属性合并到_roleData中
            var customProperties = getCustomPropertiesFromNote(enemy.note);
            for (var property in customProperties) {
                this._roleData[property] = customProperties[property];
            }

            // 设置初始状态
            var initialState = getInitialStateFromNote(this.event().note);
            if (initialState) {
                StateMachineManager.setState(this.eventId(), initialState);
            }

        } else {
            console.error('Role ID ' + roleId + ' does not exist in the enemy database.');
            this._roleData = null;
        }
    } else {
        this._roleData = null;
    }
    
};

    // 3. 添加一个获取函数，以便其他插件或代码可以访问这些属性
    Game_Event.prototype.getRoleData = function() {
        return this._roleData;
    };

     // 访问特定属性的函数
     Game_Event.prototype.getRoleAttribute = function(attribute) {
        if (this._roleData && this._roleData.hasOwnProperty(attribute)) {
            return this._roleData[attribute];
        }
        return null;
    };
    var STATES = {
        MOVE_TOWARDS_PLAYER: 'move_towards_player',
        MOVE_AWAY_FROM_PLAYER: 'move_away_from_player',
        MOVE_RANDOMLY: 'move_randomly',
        ATTACK: 'attack',
        RUN_AWAY: 'run_away',
    };
    var StateMachineManager = {
        currentStates: {},
    
        setState: function(eventId, state) {
            this.currentStates[eventId] = state;
        },
    
        getState: function(eventId) {
            return this.currentStates[eventId];
        },
    
        update: function(event) {
            var state = this.getState(event.eventId());
    
            switch (state) {
                case STATES.MOVE_TOWARDS_PLAYER:
                    event.dotMoveToPlayer();
        
                    // 检查距离
                    var distanceToPlayer = event.calcFar($gamePlayer);
                    if (distanceToPlayer <= event.getRoleAttribute('hitRange')) {
                        this.setState(event.eventId(), STATES.ATTACK);
                    }
        
                    break;
        
                case STATES.ATTACK:
                    // TODO: 执行技能动作
                    executeSkill(event, event._roleData.skills[0].id);
                    break;
        
                // ... (其他状态处理)
        
                default:
                    break;
            }
        }
    };

    function executeSkill(event, skillId) {
        // TODO: 根据技能ID执行具体动作
    
        console.log(`Event ${event.eventId()} is executing skill ${skillId}`);
    };

    var _Game_Event_update = Game_Event.prototype.update;
    Game_Event.prototype.update = function() {
        _Game_Event_update.call(this);
    
        if (this._roleData) {
            StateMachineManager.update(this);
        }
    };
    var getInitialStateFromNote = function(note) {
        var regex = /<initial_state:(.+?)>/i;
        var match = regex.exec(note);
    
        if (match) {
            return match[1].trim().toLowerCase();
        }
    
        return null;
    };
    

    // 修改特定属性的函数
    Game_Event.prototype.setRoleAttribute = function(attribute, value) {
        if (this._roleData) {
            this._roleData[attribute] = value;
        }
    };

    

})();