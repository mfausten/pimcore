/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Enterprise License (PEL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PEL
 */

/*global google */
pimcore.registerNS("pimcore.settings.targeting.targetGroups.item");
pimcore.settings.targeting.targetGroups.item = Class.create({

    initialize: function(parent, data) {
        this.parent = parent;
        this.data = data;
        this.currentIndex = 0;

        this.tabPanel = new Ext.TabPanel({
            activeTab: 0,
            title: this.data.name,
            closable: true,
            deferredRender: false,
            forceLayout: true,
            id: "pimcore_target_groups_panel_" + this.data.id,
            buttons: [{
                text: t("save"),
                iconCls: "pimcore_icon_apply",
                handler: this.save.bind(this)
            }],
            items: [
                this.getSettings(),
                this.getConditions()
            ]
        });

        // fill data into conditions
        this.initializeConditions();

        this.parent.panel.add(this.tabPanel);
        this.parent.panel.setActiveTab(this.tabPanel);
        this.parent.panel.updateLayout();
    },

    initializeConditions: function() {
        var condition;
        if (this.data.conditions && this.data.conditions.length > 0) {
            for (var i = 0; i < this.data.conditions.length; i++) {
                try {
                    condition = pimcore.settings.targeting.conditions.create(this.data.conditions[i].type);
                } catch (e) {
                    console.error(e);
                    continue;
                }

                if (!condition.matchesScope('targeting_group_entry_condition')) {
                    console.error('Condition ', this.data.conditions[i].type, 'does not match rule scope');
                    continue;
                }

                this.addCondition(condition, this.data.conditions[i]);
            }
        }
    },

    getSettings: function () {

        this.settingsForm = new Ext.form.FormPanel({
            title: t("settings"),
            bodyStyle: "padding:10px;",
            autoScroll: true,
            border:false,
            items: [{
                xtype: "textfield",
                fieldLabel: t("name"),
                name: "name",
                width: 350,
                disabled: true,
                value: this.data.name
            }, {
                name: "description",
                fieldLabel: t("description"),
                xtype: "textarea",
                width: 500,
                height: 100,
                value: this.data.description
            }, {
                name: "threshold",
                fieldLabel: t("threshold"),
                xtype: "numberfield",
                value: this.data["threshold"]
            }, {
                name: "active",
                fieldLabel: t("active"),
                xtype: "checkbox",
                checked: this.data["active"]
            }]
        });

        return this.settingsForm;
    },

    getConditions: function() {
        var createHandler = function(condition) {
            return this.addCondition.bind(this, condition);
        }.bind(this);

        var addMenu = [];
        Ext.Array.forEach(pimcore.settings.targeting.conditions.getKeys(), function(key) {
            var condition;

            try {
                condition = pimcore.settings.targeting.conditions.create(key);
            } catch (e) {
                console.error(e);
                return;
            }

            if (!condition.matchesScope('targeting_group_entry_condition')) {
                return;
            }

            addMenu.push({
                iconCls: condition.getIconCls(),
                text: condition.getName(),
                handler: createHandler(condition)
            });
        });

        this.conditionsContainer = new Ext.Panel({
            title: t("entry_conditions"),
            autoScroll: true,
            forceLayout: true,
            tbar: [{
                iconCls: "pimcore_icon_add",
                menu: addMenu
            }, "-", {
                xtype: "tbtext",
                text: t("entry_conditions_description")
            }],
            border: false
        });

        return this.conditionsContainer;
    },

    addCondition: function (condition, data) {
        if ('undefined' === typeof data) {
            data = {};
        }

        var item = condition.getPanel(this, data);

        // add logic for brackets
        var tab = this;
        item.on("afterrender", function (el) {
            el.getEl().applyStyles({position: "relative", "min-height": "40px", "border-bottom": "1px solid #d0d0d0"});
            var leftBracket = el.getEl().insertHtml("beforeEnd",
                '<div class="pimcore_targeting_bracket pimcore_targeting_bracket_left">(</div>', true);
            var rightBracket = el.getEl().insertHtml("beforeEnd",
                '<div class="pimcore_targeting_bracket pimcore_targeting_bracket_right">)</div>', true);

            if (data["bracketLeft"]) {
                leftBracket.addCls("pimcore_targeting_bracket_active");
            }

            if (data["bracketRight"]) {
                rightBracket.addCls("pimcore_targeting_bracket_active");
            }

            // open
            leftBracket.on("click", function (ev, el) {
                var bracket = Ext.get(el);
                bracket.toggleCls("pimcore_targeting_bracket_active");

                tab.recalculateBracketIdent(tab.conditionsContainer.items);
            });

            // close
            rightBracket.on("click", function (ev, el) {
                var bracket = Ext.get(el);
                bracket.toggleCls("pimcore_targeting_bracket_active");

                tab.recalculateBracketIdent(tab.conditionsContainer.items);
            });

            // make ident
            tab.recalculateBracketIdent(tab.conditionsContainer.items);
        });

        this.conditionsContainer.add(item);
        item.updateLayout();
        this.conditionsContainer.updateLayout();

        this.currentIndex++;

        this.recalculateButtonStatus();
    },

    save: function () {

        var saveData = {};
        saveData["settings"] = this.settingsForm.getForm().getFieldValues();

        var conditionsData = [];
        var condition, tb, operator;
        var conditions = this.conditionsContainer.items.getRange();
        for (var i=0; i<conditions.length; i++) {
            condition = conditions[i].getForm().getFieldValues();

            // get the operator (AND, OR, AND_NOT)
            var tb = conditions[i].getDockedItems()[0];
            if (tb.getComponent("toggle_or").pressed) {
                operator = "or";
            } else if (tb.getComponent("toggle_and_not").pressed) {
                operator = "and_not";
            } else {
                operator = "and";
            }
            condition["operator"] = operator;

            // get the brackets
            condition["bracketLeft"] = Ext.get(conditions[i].getEl().query(".pimcore_targeting_bracket_left")[0])
                                                                .hasCls("pimcore_targeting_bracket_active");
            condition["bracketRight"] = Ext.get(conditions[i].getEl().query(".pimcore_targeting_bracket_right")[0])
                                                                .hasCls("pimcore_targeting_bracket_active");

            conditionsData.push(condition);
        }
        saveData["conditions"] = conditionsData;

        Ext.Ajax.request({
            url: "/admin/targeting/target-group/save",
            params: {
                id: this.data.id,
                data: Ext.encode(saveData)
            },
            method: "post",
            success: function () {
                pimcore.helpers.showNotification(t("success"), t("item_saved_successfully"), "success");
            }.bind(this)
        });
    },

    recalculateButtonStatus: function () {
        var conditions = this.conditionsContainer.items.getRange();
        var tb;
        for (var i=0; i<conditions.length; i++) {
            var tb = conditions[i].getDockedItems()[0];
            if(i==0) {
                tb.getComponent("toggle_and").hide();
                tb.getComponent("toggle_or").hide();
                tb.getComponent("toggle_and_not").hide();
            } else {
                tb.getComponent("toggle_and").show();
                tb.getComponent("toggle_or").show();
                tb.getComponent("toggle_and_not").show();
            }
        }
    },


    /**
     * make ident for bracket
     * @param list
     */
    recalculateBracketIdent: function(list) {
        var ident = 0, lastIdent = 0, margin = 20;
        var colors = ["transparent","#007bff", "#00ff99", "#e1a6ff", "#ff3c00", "#000000"];

        list.each(function (condition) {

            // only rendered conditions
            if(condition.rendered == false)
                return;

            // html from this condition
            var item = condition.getEl();


            // apply ident margin
            item.applyStyles({
                "margin-left": margin * ident + "px",
                "margin-right": margin * ident + "px"
            });


            // apply colors
            if(ident > 0)
                item.applyStyles({
                    "border-left": "1px solid " + colors[ident],
                    "border-right": "1px solid " + colors[ident]
                });
            else
                item.applyStyles({
                    "border-left": "0px",
                    "border-right": "0px"
                });


            // apply specials :-)
            if(ident == 0)
                item.applyStyles({
                    "margin-top": "10px"
                });
            else if(ident == lastIdent)
                item.applyStyles({
                    "margin-top": "0px",
                    "margin-bottom": "0px"
                });
            else
                item.applyStyles({
                    "margin-top": "5px"
                });


            // remember current ident
            lastIdent = ident;


            // check if a bracket is open
            if(item.select('.pimcore_targeting_bracket_left.pimcore_targeting_bracket_active').getCount() == 1)
            {
                ident++;
            }
            // check if a bracket is close
            else if(item.select('.pimcore_targeting_bracket_right.pimcore_targeting_bracket_active').getCount() == 1)
            {
                if(ident > 0)
                    ident--;
            }
        });
        this.conditionsContainer.updateLayout();
    }

});
