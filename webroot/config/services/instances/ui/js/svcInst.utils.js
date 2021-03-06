/*
 * Copyright (c) 2015 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore'
], function (_) {
    var svcInstUtils = function() {
        var self = this;
        this.getVNNameFormatter = function (vnFqn, domain, project) {
            if (null == domain) {
                domain = getCookie('domain');
            }
            if (null == project) {
                project = getCookie('project');
            }
            if ((null == vnFqn) || (null == vnFqn[0]) ||
                (null == vnFqn[1])) {
                return null;
            }
            if ((domain == vnFqn[0]) && (project == vnFqn[1])) {
                return vnFqn[2];
            }
            return vnFqn[2] + " (" + vnFqn[0] + ":" + vnFqn[1] + ")";
        },
        this.virtNwListFormatter = function(response, isShared) {
            var vnListResp =
                getValueByJsonPath(response, 'virtual-networks', []);
            var vnList = [];
            var vnCnt = vnListResp.length;
            for (var i = 0; i < vnCnt; i++) {
                if (true == isShared) {
                    var domain = getValueByJsonPath(vnListResp[i],
                                                    'fq_name;0', null);
                    var project = getValueByJsonPath(vnListResp[i], 'fq_name;1',
                                                     null);
                    if ((domain == contrail.getCookie('domain')) &&
                        (project == contrail.getCookie('project'))) {
                        continue;
                    }
                }
                var vnText = this.getVNNameFormatter(vnListResp[i]['fq_name']);
                vnList.push({'text': vnText, id:
                            vnListResp[i]['fq_name'].join(':')});
            }
            return vnList;
        },
        this.buildVMI = function(vmi) {
            var vmVmiListObjs = {};
            if (null == vmi) {
                return {};
            }
            var domain = contrail.getCookie('domain');
            var project = contrail.getCookie('project');
            var results = [];
            var text = "";

            var instIpAddrs = getValueByJsonPath(vmi, 'instance_ip_address',
                                                 []);
            var fqn = JSON.parse(JSON.stringify(vmi['fq_name']));
            var domProj = fqn.splice(0, 2);
            if ((domain == domProj[0]) && (project == domProj[1])) {
                text = vmi['uuid'];
                if (instIpAddrs.length > 0) {
                    text = '(' + instIpAddrs.join(', ') + ') - ' + text;
                }
                return {text: text, id:
                             vmi['fq_name'].join(':') + "~~" + vmi['uuid'],
                        instIps: instIpAddrs};
            } else {
                var tmpFqn =
                    JSON.parse(JSON.stringify(vmi['fq_name']));
                var domProj = tmpFqn.splice(0, 2);
                text = vmi['uuid']  + " (" + domProj.join(':') + ")";
                if (instIpAddrs.length > 0) {
                    text = '(' + instIpAddrs.join(', ') + ') - ' + text;
                }
                return {text: text +" (" + domProj.join(':')
                             + ")",
                             id: vmi['fq_name'].join(':') +
                             "~~" + vmi['uuid'],
                        instIps: instIpAddrs};
            }
            return {};
        },
        this.vmiListFormatter = function(vmis) {
            var vnVmiMaps = {};
            var vmiToInstIpsMap = {};
            var vnList = [];
            if ((null == vmis) || (!vmis.length)) {
                return ({vnList:
                        [{id: null, text: "No Virtual Networks found"}],
                        vnVmiMaps: vnVmiMaps});
            }
            var vmisCnt = vmis.length;
            var tmpVNIds = {};
            if (null == window.vmiToInstIpsMap) {
                window.vmiToInstIpsMap = {};
            }
            for (var i = 0; i < vmisCnt; i++) {
                var vmi =
                    getValueByJsonPath(vmis[i],
                                       'virtual-machine-interface', null);
                if (null == vmi) {
                    continue;
                }
                var builtVMI = this.buildVMI(vmi);
                if (null != builtVMI.instIps) {
                    window.vmiToInstIpsMap[vmi.uuid] = builtVMI.instIps;
                }
                var vmRefs = getValueByJsonPath(vmi,
                                                'virtual_machine_refs',
                                                []);
                //if (vmRefs.length > 0) {
                    /* If already vm_refs found, skip those */
                 //   continue;
                //}
                var vnRefs = getValueByJsonPath(vmi,
                                                'virtual_network_refs', []);
                //if (!vnRefs.length) {
                    /* We should not come here */
                 //   continue;
                //}
                var vnRefsCnt = vnRefs.length;
                for (var j = 0; j < vnRefsCnt; j++) {
                    var vnText = this.getVNNameFormatter(vnRefs[j]['to']);
                    var vnFqn = vnRefs[j]['to'].join(':');
                    if (null == tmpVNIds[vnFqn]) {
                        vnList.push({'text': vnText, id: vnFqn});
                        tmpVNIds[vnFqn] = true;
                    }
                    if (null == vnVmiMaps[vnFqn]) {
                        vnVmiMaps[vnFqn] = [];
                    }
                    vnVmiMaps[vnFqn].push(builtVMI);
                }
            }
            return {vnList: vnList, vnVmiMaps: vnVmiMaps};
        },
        this.updateVnVmiMaps = function(vmiList) {
            var vnObjs = this.vmiListFormatter(vmiList);
            if (null == window.vnList) {
                window.vnList = [];
            }
            window.vnList.concat(vnObjs.vnList);
            if (null == window.vnVmiMaps) {
                window.vnVmiMaps = {};
            }
            for (key in vnObjs.vnVmiMaps) {
                window.vnVmiMaps[key] = vnObjs.vnVmiMaps[key];
            }
        },
        this.buildTextValueByConfigList =function (configListObj, type) {
            if ((null == configListObj[type]) || (!configListObj[type].length)) {
                return [];
            }
            var domain = contrail.getCookie('domain');
            var project = contrail.getCookie('project');
            var results = [];

            var configList = configListObj[type];
            var cnt = configList.length;
            for (var i = 0; i < cnt; i++) {
                var fqn = JSON.parse(JSON.stringify(configList[i]['fq_name']));
                var domProj = fqn.splice(0, 2);
                if ((domain == domProj[0]) && (project == domProj[1])) {
                    var text = fqn.join(':');
                    results.push({text: text, value:
                                 configList[i]['fq_name'].join(':') +
                                 "~~" + configList[i]['uuid']});
                } else {
                    var tmpFqn =
                        JSON.parse(JSON.stringify(configList[i]['fq_name']));
                    var domProj = tmpFqn.splice(0, 2);
                    var text = fqn[fqn.length - 1];
                    results.push({text: text +" (" + domProj.join(':')
                                 + ")",
                                 value: configList[i]['fq_name'].join(':') +
                                 "~~" + configList[i]['uuid']});
                }
            }
            return results;
        },
        this.getRouteAggregateInterfaceTypes = function(svcTmplIntfTypes) {
            var rtAggIntfTypesList = [];
            if ((null == svcTmplIntfTypes) || (!svcTmplIntfTypes.length)) {
                return rtAggIntfTypesList;
            }
            var intfCnt = svcTmplIntfTypes.length;
            for (var i = 0; i < intfCnt; i++) {
                if (('left' == svcTmplIntfTypes[i]) ||
                    ('right' == svcTmplIntfTypes[i])) {
                    rtAggIntfTypesList.push({id: svcTmplIntfTypes[i],
                                            text: svcTmplIntfTypes[i]});
                }
            }
            return rtAggIntfTypesList;
        },
        this.svcTemplateFormatter = function(svcTmpl) {
            var svcIntfTypes = [];
            var dispStr =
                getValueByJsonPath(svcTmpl,
                                   'service-template;display_name', '-');
            dispStr += " - ";
            var svcTempProp =
                getValueByJsonPath(svcTmpl,
                                   'service-template;service_template_properties',
                                   {});
            var svcTempVersion = getValueByJsonPath(svcTempProp, 'version', 1);
            var intfType =
                getValueByJsonPath(svcTempProp, 'interface_type', []);
            var intfCnt = intfType.length;
            for (var j = 0; j < intfCnt; j++) {
                svcIntfTypes.push(intfType[j]['service_interface_type']);
            }

            dispStr += "[" +
                getValueByJsonPath(svcTempProp, 'service_mode', '-') + " (" +
                svcIntfTypes.join(', ') + ")]";
            return dispStr + ' - v' + svcTempVersion;
        },
        this.getSvcTmplDetailsBySvcTmplStr = function(svcTmplStr) {
            /* This function must be called after grid is initialized */
            if (null == svcTmplStr) {
                return null;
            }
            var gridElId = "#" + ctwl.SERVICE_INSTANCES_GRID_ID;
            try {
                var svcTmpls = $(gridElId).data('svcInstTmplts');
            } catch(e) {
                return null;
            }
            var svcTmplFqn = getCookie('domain') + ":" +
                svcTmplStr.split(' - [')[0];
            return svcTmpls[svcTmplFqn];
        },
        this.getStaticRtsInterfaceTypesByStr = function(svcTmplStr, isRaw) {
            var svcTmpl = this.getSvcTmplDetailsBySvcTmplStr(svcTmplStr);
            return this.getStaticRtsInterfaceTypesBySvcTmpl(svcTmpl, isRaw);
        },
        this.getStaticRtsInterfaceTypesBySvcTmpl = function(svcTmpl, isRaw) {
            var intfTypes = getValueByJsonPath(svcTmpl,
                                               'service_template_properties;interface_type',
                                               []);
            var len = intfTypes.length;
            var staticRtIntfList = [];
            var rawIntfList = [];
            for (var i = 0; i < len; i++) {
                var staticRtEnabled = getValueByJsonPath(intfTypes[i],
                                                         'static_route_enable',
                                                         false);
                var svcIntfType = getValueByJsonPath(intfTypes[i],
                                                     'service_interface_type',
                                                     null);
                if (null == svcIntfType) {
                    console.log('Weired! We got null interface type in ' +
                                'template ' + svcTmplStr);
                    continue;
                }
                if (true == staticRtEnabled) {
                    rawIntfList.push(svcIntfType);
                    staticRtIntfList.push({id: svcIntfType, text: svcIntfType});
                }
            }
            if (true == isRaw) {
                return rawIntfList;
            }
            return staticRtIntfList;
        },
        this.getSvcTmplIntfTypes = function(svcTmpl) {
            var svcIntfTypes = [];
            var svcTempProp =
                getValueByJsonPath(svcTmpl,
                                   'service-template;service_template_properties',
                                   {});
            var intfType =
                getValueByJsonPath(svcTempProp, 'interface_type', []);
            var intfCnt = intfType.length;
            for (var j = 0; j < intfCnt; j++) {
                svcIntfTypes.push(intfType[j]['service_interface_type']);
            }
            return svcIntfTypes;
        },
        this.getVNListByVNValue = function(vnVal) {
            var vnList = window.vnVmiList;
            var splitArr = vnVal.split('~~');
            if (null != vnList(splitArr[1])) {
                return vnList(splitArr[1]);
            }
            return [];
        }
        this.getPortTuples = function(svcInstName, portTupleCollection) {
            var nameList = [];
            if (null == portTupleCollection) {
                return nameList;
            }
            var len = portTupleCollection.length;
            var models = portTupleCollection['models'];
            for (var i = 0; i < len; i++) {
                var attr = models[i]['attributes'];
                nameList[i] = {};
                var name = attr['portTupleName']();
                var portTupleData = attr['portTupleData']();
                nameList[i]['to'] = [contrail.getCookie('domain'),
                    contrail.getCookie('project'), svcInstName, name];
                if ((null != portTupleData) && (null != portTupleData['uuid'])) {
                    nameList[i]['uuid'] = portTupleData['uuid'];
                }
                var intfs = attr['portTupleInterfaces']();
                var intfsCnt = intfs.length;
                for (var j = 0; j < intfsCnt; j++) {
                    if (0 == j) {
                        nameList[i]['vmis'] = [];
                    }
                    var intfAttr = intfs[j].model().attributes;
                    var vmi = intfAttr['interface']();
                    if (null == vmi) {
                        continue;
                    }
                    var vmiArr = vmi.split('~~');
                    var intfObj = {'fq_name': vmiArr[0].split(':'),
                        'interfaceType': intfAttr['interfaceType'](),
                        'uuid': vmiArr[1]};
                    nameList[i]['vmis'].push(intfObj);
                }
            }
            return nameList;
        },
        this.getVNByTmplType = function(intfType, svcTmpl) {
            if ((null == window.vnList) ||
                (!window.vnList.length)) {
                return null;
            }
            var intfTypes =
                getValueByJsonPath(svcTmpl,
                                   'service-template;service_template_properties;interface_type',
                                   []);
            var svcMode =
                getValueByJsonPath(svcTmpl,
                                   'service-template;service_template_properties;service_mode',
                                   null);
            var intfTypesCnt = intfTypes.length;
            for (var i = 0; i < intfTypesCnt; i++) {
                if (intfTypes[i]['service_interface_type'] == intfType) {
                    break;
                }
            }
            if (i == intfTypesCnt) {
                return null;
            }
            if (true == intfTypes[i]['static_route_enable']) {
                return window.vnList[1];
            }
            if ('management' != intfTypes[i]['service_interface_type']) {
                if (('in-network' == svcMode) ||
                    ('in-network-nat' == svcMode)) {
                    return window.vnList[1];
                }
                if ('other' == intfTypes[i]['service_interface_type']) {
                    return window.vnList[1];
                }
            }
            return window.vnList[0];
        },
        this.getPowerState = function(val) {
            var powerString="";
            switch(val){
            case 0:
            case 0x00:
                powerString = "NOSTATE";
                break;
            case 1:
            case 0x01:
                powerString = "RUNNING";
                break;
            case 3:
            case 0x03:
                powerString = "PAUSED";
                break;
            case 4:
            case 0x04:
                powerString = "SHUTDOWN";
                break;
            case 6:
            case 0x06:
                powerString = "CRASHED";
                break;
            case 7:
            case 0x07:
                powerString = "SUSPENDED";
                break;
            }
            return(powerString);
        },
        this.getIntfVNCollectionView = function(isDisabled) {
            return {
                columns: [{
                    elementId: 'interfaceType',
                    view: 'FormInputView',
                    class: "", width: 395,
                    name: 'Interface Type',
                    viewConfig: {
                        disabled: true,
                        templateId: cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                        path: 'interfaceType',
                        dataBindValue: 'interfaceType()'
                    }
                },
                {
                    elementId: 'virtualNetwork',
                    view: 'FormDropdownView',
                    class: "", width: 370,
                    name: 'Virtual Network',
                    viewConfig: {
                        disabled: isDisabled,
                        templateId: cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                        path: 'virtualNetwork',
                        dataBindValue: 'virtualNetwork()',
                        dataBindOptionList: 'allVNListData()',
                        elementConfig: {
                            minimumResultsForSearch: 1,
                            placeholder: 'Select Virtual Network'
                        }
                    }
                }]
            }
        },
        this.getPortTupleNameViewConfig = function(isDisabled) {
            return {
                rowActions: [
                    {onClick: "function() {$root.addPortTuple();}",
                     iconClass: 'icon-plus'},
                    {onClick: "deletePortTuple()",
                     iconClass: 'icon-minus'}
                ],
                columns: [{
                    elementId: 'portTupleDisplayName',
                    view: 'FormInputView',
                    class: "", width: "600",
                    name: 'Tuple',
                    viewConfig: {
                        disabled: true,
                        templateId: cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                        path: 'portTupleDisplayName',
                        dataBindValue: 'portTupleDisplayName()'
                    }
                }]
            }
        },
        this.getPortTupleViewConfig = function(isDisabled) {
            return {
                columns: [{
                    elementId: 'port_tuples_vmi_collection',
                    view: "FormEditableGridView",
                    viewConfig: {
                        colSpan: '2',
                        path: 'portTupleInterfaces',
                        collection: 'portTupleInterfaces()',
                        validation: 'portTupleInterfacesValidation',
                        templateId: cowc.TMP_EDITABLE_GRID_VIEW,
                        /*
                        collectionActions: {
                            add: {onClick: "addPortTupleInterface()",
                                  iconClass: 'icon-plus',
                                  buttonTitle: 'Add Interface'
                            }
                        },
                        */
                        //rows: [{
                            /*
                            rowActions: [
                                {onClick: "deletePortTupleInterface()",
                                 iconClass: 'icon-minus'}
                            ],
                            */
                            columns: [{
                                elementId: 'interfaceType',
                                view: 'FormInputView',
                                class: "",
                                name:'Interface Type',
                                viewConfig: {
                                    placeholder: 'Select Interface Type',
                                    width: 250,
                                    disabled: true,
                                    templateId:
                                        cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                                    path: 'interfaceType',
                                    dataBindValue: 'interfaceType()'
                                }
                            },
                            {
                                elementId: 'interface',
                                view: 'FormDropdownView',
                                class: "",
                                name:'Virtual Machine Interface',
                                viewConfig: {
                                    templateId:
                                        cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                    width: 230,
                                    path: 'interface',
                                    disabled: 'disable()',
                                    dataBindValue: 'interface()',
                                    dataBindOptionList: 'vmiListData()',
                                    elementConfig: {
                                        minimumResultsForSearch: 1,
                                        placeholder: 'Select Virtual Machine' +
                                                     ' Interface',
                                    }
                                }
                            //}]
                        }]
                    }
                }]
            }
        },
        this.getPortTuplesView = function (self, isDisabled) {
            return {
                elementId: 'portTuplesCollection',
                view: 'AccordianView',
                active:false,
                viewConfig: [{
                    elementId: 'portTuplesCollectionAccordian',
                    visible: 'showPortTuplesView',
                    title: 'Port Tuples',
                    view: 'SectionView',
                    active:false,
                    viewConfig: {
                        rows: [{
                            columns: [{
                                elementId: 'port-tuples-collection',
                                view: 'FormCollectionView',
                                viewConfig: {
                                    path: 'portTuples',
                                    collection: 'portTuples()',
                                    validation: 'portTuplesValidation',
                                    //accordionable: true,
                                    templateId: cowc.TMPL_COLLECTION_GRIDACTION_HEADING_VIEW,
                                        gridActions: [
                                            {
                                                onClick: "function() {addPortTuple();}",
                                                buttonTitle: ""
                                            }
                                        ],
                                    rows: [/*{
                                        rowActions: [
                                            {onClick: "deletePortTuple()",
                                             iconClass: 'icon-minus'}
                                        ]},*/
                                        this.getPortTupleNameViewConfig(isDisabled),
                                        this.getPortTupleViewConfig(isDisabled),
                                    ]
                                }
                            }]
                        }]
                    }
                }]
            }
        },
        this.getSvcInstV1PropView = function(isDisabled) {
            return {
                elementId: 'svcInstV1PropSection',
                title: 'Advanced Options',
                view: 'SectionView',
                viewConfig: {
                    visible: 'showIfV1Template',
                    rows: [
                    {
                        columns: [{
                            elementId: 'rtPolicyAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getRtPolicyAccordianView(isDisabled),
                            ]
                        }]
                    },
                    {
                        columns: [{
                            elementId: 'rtAggAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getRtAggregateAccordianView(isDisabled)
                            ]
                        }]
                    },
                    {
                        columns: [{
                            elementId: 'staticRtAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getStaticRouteAccordianView(isDisabled)
                            ]
                        }]

                    }]
                }
            }
        },
        this.getSvcInstV2PropView = function(isDisabled) {
            return {
                elementId: 'svcInstV2PropSection',
                title: 'Advanced Options',
                view: 'SectionView',
                viewConfig: {
                    visible: 'showIfV2Template',
                    rows: [{
                        columns: [{
                            elementId: 'svcHealthChkAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getSvcHealthCheckAccordianView(isDisabled),
                            ]
                        }]
                    },
                    {
                        columns: [{
                            elementId: 'rtPolicyAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getRtPolicyAccordianView(isDisabled)
                            ]
                        }]
                    },
                    {
                        columns: [{
                            elementId: 'rtAggAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getRtAggregateAccordianView(isDisabled)
                            ]
                        }]
                    },
                    {
                        columns: [{
                            elementId: 'allowedAddrPairAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getAllowedAddressPairAccordianConfig(isDisabled)
                            ]
                        }]
                    },
                    {
                        columns: [{
                            elementId: 'intfRtTableAccordian',
                            view: 'AccordianView',
                            viewConfig: [
                                this.getIntfRtTableAccordianView(isDisabled)
                            ]
                        }]
                    }]
                }
            }
        },
        this.getSvcHealthCheckAccordianView = function (isDisabled) {
            return {
                elementId: 'healthChkSection',
                title: 'Service Health Check',
                view: 'SectionView',
                active:false,
                viewConfig: {
                    rows: [{
                        columns: [{
                            elementId: 'svcHealtchChecks',
                            view: 'FormEditableGridView',
                            viewConfig: {
                                path: 'svcHealtchChecks',
                                collection: 'svcHealtchChecks',
                                validation: 'svcHealtchChecksValidation',
                                templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                                columns: [{
                                    elementId: 'interface_type',
                                    name: 'Interface Type',
                                    view: 'FormDropdownView',
                                    class: "",
                                    viewConfig: {
                                        width: 280,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'interface_type',
                                        dataBindValue: 'interface_type()',
                                        dataBindOptionList:
                                            'interfaceTypesData()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Interface ' +
                                                         'Type',
                                        }
                                    }
                                },
                                {
                                    elementId: 'service_health_check',
                                    name: 'Service Health Check',
                                    view: 'FormDropdownView',
                                    class: "",
                                    viewConfig: {
                                        width: 250,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'service_health_check',
                                        dataBindValue: 'service_health_check()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Health' +
                                                         ' Check Service',
                                            dataTextField: 'text',
                                            dataValueField: 'value',
                                            data: window.healthCheckServiceList
                                        }
                                    }
                                }],
                                rowActions: [{
                                    onClick: "function() {\
                                        $root.addPropSvcHealthChk();\
                                    }",
                                    iconClass: 'icon-plus'
                                },
                                {
                                    onClick: "function() {\
                                        $root.deleteSvcInstProperty($data, this);\
                                    }",
                                    iconClass: 'icon-minus'
                                }],
                                gridActions: [{
                                    onClick: "function() {\
                                        $root.addPropSvcHealthChk();\
                                    }"
                                }]
                            }
                        }]
                    }]
                }
            }
        },
        this.getIntfRtTableAccordianView = function (isDisabled) {
            return {
                elementId: 'intfRtTableSection',
                title: 'Static Route',
                view: 'SectionView',
                active:false,
                viewConfig: {
                    rows: [{
                        columns: [{
                            elementId: 'intfRtTables',
                            view: 'FormEditableGridView',
                            viewConfig: {
                                path: 'intfRtTables',
                                collection: 'intfRtTables',
                                validation: 'intfRtTablesValidation',
                                templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                                columns: [{
                                    elementId: 'interface_type',
                                    name: 'Interface Type',
                                    view: 'FormDropdownView',
                                    class: "",
                                    viewConfig: {
                                        width: 280,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'interface_type',
                                        dataBindValue: 'interface_type()',
                                        dataBindOptionList:
                                            'interfaceTypesData()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Interface ' +
                                                         'Type',
                                        }
                                    }
                                },
                                {
                                    elementId: 'interface_route_table',
                                    name: 'Interface Route Table',
                                    view: 'FormMultiselectView',
                                    class: "",
                                    viewConfig: {
                                        width: 250,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_MULTISELECT_VIEW,
                                        path: 'interface_route_table',
                                        dataBindValue: 'interface_route_table()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select ' +
                                                         'Interface Route Table',
                                            dataTextField: 'text',
                                            dataValueField: 'value',
                                            data: window.interfaceRouteTableList
                                        }
                                    }
                                }],
                                rowActions: [{
                                    onClick: "function() {\
                                        $root.addPropIntfRtTable();\
                                    }",
                                    iconClass: 'icon-plus'
                                },
                                {
                                    onClick: "function() {\
                                        $root.deleteSvcInstProperty($data, this);\
                                    }",
                                    iconClass: 'icon-minus'
                                }],
                                gridActions: [{
                                    onClick: "function() {\
                                        $root.addPropIntfRtTable();\
                                    }"
                                }]
                            }
                        }]
                    }]
                }
            }
        },
        this.getStaticRouteAccordianView = function(isDisabled) {
            return {
                visible: 'staticRoutesAccordianVisible',
                elementId: 'staticRouteSection',
                title: 'Static Route',
                view: 'SectionView',
                active:false,
                viewConfig: {
                    rows: [{
                        columns: [{
                            elementId: 'staticRtTables',
                            view: 'FormEditableGridView',
                            viewConfig: {
                                path: 'staticRoutes',
                                collection: 'staticRoutes',
                                validation: 'staticRoutesValidation',
                                templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                                columns: [{
                                    elementId: 'interface_type',
                                    name: 'Interface Type',
                                    view: 'FormDropdownView',
                                    class: "",
                                    width: 150,
                                    viewConfig: {
                                        width: 150,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'interface_type',
                                        dataBindValue: 'interface_type()',
                                        dataBindOptionList:
                                            'interfaceTypesData()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Interface ' +
                                                         'Type',
                                        }
                                    }
                                },
                                {
                                    elementId: 'prefix',
                                    view: 'FormInputView',
                                    class: "", width: 200,
                                    name: 'Prefix',
                                    viewConfig: {
                                        width:200,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                                        path: 'prefix',
                                        dataBindValue: 'prefix()',
                                        placeholder: 'Enter prefix'
                                    }
                                },
                                {
                                    elementId: 'community_attributes',
                                    view: 'FormMultiselectView',
                                    width:200,
                                    name: 'Community',
                                    viewConfig: {
                                        width: 200,
                                        templateId: cowc.TMPL_EDITABLE_GRID_MULTISELECT_VIEW,
                                        path: 'community_attributes',
                                        dataBindValue: 'community_attributes()',
                                        elementConfig: {
                                            placeholder: 'Select or Enter Communities',
                                            dataTextField: "text",
                                            dataValueField: "id",
                                            data : ctwc.DEFAULT_COMMUNITIES,
                                            tags: true
                                        }
                                    }
                                }],
                                rowActions: [{
                                    onClick: "function() {\
                                        $root.addPropStaticRtTable();\
                                    }",
                                    iconClass: 'icon-plus'
                                },
                                {
                                    onClick: "function() {\
                                        $root.deleteSvcInstProperty($data, this);\
                                    }",
                                    iconClass: 'icon-minus'
                                }],
                                gridActions: [{
                                    onClick: "function() {\
                                        $root.addPropStaticRtTable();\
                                    }"
                                }]
                            }
                        }]
                    }]
                }
            }
        },
        this.getRtPolicyAccordianView = function (isDisabled) {
            return {
                visible: 'ifNotTransparentTmpl',
                elementId: 'rtPolicySection',
                title: 'Routing Policy',
                active:false,
                view: 'SectionView',
                active:false,
                viewConfig: {
                    rows: [{
                        columns: [{
                            elementId: 'rtPolicys',
                            view: 'FormEditableGridView',
                            viewConfig: {
                                path: 'rtPolicys',
                                collection: 'rtPolicys',
                                validation: 'rtPolicysValidation',
                                templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                                columns: [{
                                    elementId: 'interface_type',
                                    name: 'Interface Type',
                                    view: 'FormDropdownView',
                                    class: "",
                                    viewConfig: {
                                        width: 280,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'interface_type',
                                        dataBindValue: 'interface_type()',
                                        dataBindOptionList:
                                            'rtPolicyInterfaceTypesData()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Interface ' +
                                                'Type'
                                        }
                                    }
                                },
                                {
                                    elementId: 'routing_policy',
                                    name: 'Routing Policy',
                                    view: 'FormMultiselectView',
                                    class: "",
                                    viewConfig: {
                                        width: 250,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_MULTISELECT_VIEW,
                                        path: 'routing_policy',
                                        dataBindValue: 'routing_policy()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Routing ' +
                                                         'Policy',
                                            dataTextField: 'text',
                                            dataValueField: 'value',
                                            data: window.routingPolicyList
                                        }
                                    }
                                }],
                                rowActions: [{
                                    onClick: "function() {\
                                        $root.addPropRtPolicy();\
                                    }",
                                    iconClass: 'icon-plus'
                                },
                                {
                                    onClick: "function() {\
                                        $root.deleteSvcInstProperty($data, this);\
                                    }",
                                    iconClass: 'icon-minus'
                                }],
                                gridActions: [{
                                    onClick: "function() {\
                                        $root.addPropRtPolicy();\
                                    }"
                                }]
                            }
                        }]
                    }]
                }
            }
        },
        this.getAllowedAddressPairAccordianConfig = function(isDisabled) {
            return {
                elementId: 'allowedAddressPairElId',
                title: 'Allowed Address Pair',
                view: 'SectionView',
                active:false,
                viewConfig: {
                    rows: [{
                        columns: [{
                        elementId: 'allowedAddressPairCollection',
                        view: 'FormEditableGridView',
                            viewConfig: {
                                path: "allowedAddressPairCollection",
                                validation: 'allowedAddressPairValidations',
                                templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                                collection: "allowedAddressPairCollection",
                                columns: [
                                {
                                    elementId: 'interface_type',
                                    name: 'Interface Type',
                                    view: 'FormDropdownView',
                                    class: "",
                                    width: 230,
                                    viewConfig: {
                                        width: 230,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'interface_type',
                                        dataBindValue: 'interface_type()',
                                        dataBindOptionList:
                                            'interfaceTypesData()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Interface ' +
                                                'Type'
                                        }
                                    }
                                },
                                {
                                    elementId: 'user_created_ip',
                                    name: "IP",
                                    view: "FormInputView",
                                    viewConfig: {
                                        path: 'user_created_ip',
                                        templateId: cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                                        dataBindValue: 'user_created_ip()',
                                        placeholder: 'IP',
                                        width:275,
                                        label: 'IP'
                                    }
                                },
                                {
                                    elementId: 'mac',
                                    name: "MAC",
                                    view: "FormInputView",
                                    viewConfig: {
                                        path: 'mac',
                                        templateId: cowc.TMPL_EDITABLE_GRID_INPUT_VIEW,
                                        dataBindValue: 'mac()',
                                        placeholder: 'MAC',
                                        width:275,
                                        label: 'MAC'
                                    }
                                }],
                                rowActions: [{
                                 onClick: "function() { $root.addAAP(); }",
                                iconClass: 'icon-plus',
                                },
                                {
                                    onClick:
                                    "function() { $root.deleteSvcInstProperty($data, this);}",
                                     iconClass: 'icon-minus'
                                }],
                                gridActions: [{
                                    onClick: "function() { addAAP(); }",
                                    buttonTitle: ""
                                }]
                            }
                        }]
                    }]
                }
            }
        },
        this.getRtAggregateAccordianView = function (isDisabled) {
            return {
                visible: 'ifNotTransparentTmpl',
                elementId: 'rtAggregateSection',
                title: 'Route Aggregate',
                view: 'SectionView',
                active:false,
                viewConfig: {
                    rows: [{
                        columns: [{
                            elementId: 'rtAggregates',
                            view: 'FormEditableGridView',
                            viewConfig: {
                                path: 'rtAggregates',
                                collection: 'rtAggregates',
                                validation: 'rtAggregatesValidation',
                                templateId: cowc.TMP_EDITABLE_GRID_ACTION_VIEW,
                                columns: [{
                                    elementId: 'interface_type',
                                    name: 'Interface Type',
                                    view: 'FormDropdownView',
                                    class: "",
                                    viewConfig: {
                                        width: 280,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_DROPDOWN_VIEW,
                                        path: 'interface_type',
                                        dataBindValue: 'interface_type()',
                                        dataBindOptionList:
                                            'interfaceTypesData()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Interface ' +
                                                         'Type',
                                        }
                                    }
                                },
                                {
                                    elementId: 'route_aggregate',
                                    name: 'Route Aggregate',
                                    view: 'FormMultiselectView',
                                    class: "",
                                    viewConfig: {
                                        width: 250,
                                        templateId:
                                            cowc.TMPL_EDITABLE_GRID_MULTISELECT_VIEW,
                                        path: 'route_aggregate',
                                        dataBindValue: 'route_aggregate()',
                                        elementConfig: {
                                            minimumResultsForSearch: 1,
                                            placeholder: 'Select Route' +
                                                         ' Aggregate',
                                            dataTextField: 'text',
                                            dataValueField: 'value',
                                            data: window.routeAggregateList
                                        }
                                    }
                                }],
                                rowActions: [{
                                    onClick: "function() {\
                                        $root.addPropRtAggregate();\
                                    }",
                                    iconClass: 'icon-plus'
                                },
                                {
                                    onClick: "function() {\
                                        $root.deleteSvcInstProperty($data, this);\
                                    }",
                                    iconClass: 'icon-minus'
                                }],
                                gridActions: [{
                                    onClick: "function() {\
                                        $root.addPropRtAggregate();\
                                    }"
                                }]
                            }
                        }]
                    }]
                }
            }
        },
        this.getInterfaceCollectionView = function (isDisabled) {
            return {
                    elementId: 'interfaceCollectionAccordian',
                    title: 'Interface Details',
                    view: 'SectionView',
                    viewConfig: {
                        rows: [{
                            columns: [{
                                elementId: 'interfaces-collection',
                                view: "FormCollectionView",
                                viewConfig: {
                                    path: 'interfaces',
                                    collection: 'interfaces()',
                                    validation: 'interfacesValidation',
                                    hideAdd:true,
                                    //accordionable: true,
                                    //templateId: cowc.TMPL_COLLECTION_COMMON_HEADING_VIEW,
                                    templateId: cowc.TMPL_COLLECTION_GRIDACTION_HEADING_VIEW,
                                    rows: [
                                        this.getIntfVNCollectionView(isDisabled),
                                    ]
                                }
                            }]
                        }]
                    }
                }
        }
    };
    return svcInstUtils;
});

