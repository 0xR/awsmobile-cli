/* 
 * Copyright 2017-2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
*/
"use strict";
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const opn = require('opn')

const appsyncManager = require('./appsync-operations/appsync-manager.js')
const appsyncCreate = require('./appsync-operations/ops-appsync-create.js')
const appsyncRetrieve = require('./appsync-operations/ops-appsync-retrieve.js')
const appsyncUpdate = require('./appsync-operations/ops-appsync-update.js')
const appsyncDelete = require('./appsync-operations/ops-appsync-delete.js')
const apiKeysHelper = require('./appsync-operations/helpers/api-keys-helper.js')
const dataSourceHelper = require('./appsync-operations/helpers/data-source-helper.js')
const graphqlHelper = require('./appsync-operations/helpers/graphql-api-helper.js')
const resolversHelper = require('./appsync-operations/helpers/resolvers-helper.js')
const pathManager = require('../utils/awsmobilejs-path-manager.js')
const awsmobileJSConstant = require('../utils/awsmobilejs-constant.js')
const awsConfigManager = require('../aws-operations/aws-config-manager.js')
const dfOps = require('../utils/directory-file-ops.js')

const _featureName = 'appsync'
const _featureCommands = {
    'console': 'open the web console of the appsync api associated with this project', 
    'test': 'dev test'
}

let _featureBuildDirPath
let _projectInfo
let _awsConfig
let _backendProjectDetails
let _callback


function specify(projectInfo) {
    try{
        const projectFeatureOps = require(pathManager.getProjectFeatureOpsFilePath(_featureName))
        projectFeatureOps.specify(projectInfo)
    }catch(e){
        console.log(chalk.red(_featureName + ' feature specification error:'))
        console.log(e)
    }
}

function hasCommand(command){
    return _featureCommands.hasOwnProperty(command)
}

function runCommand(command, projectInfo, args){
    switch(command){
        case 'console': 
            commandConsole(projectInfo, args)
        break
        case 'test':
            commandTest(projectInfo, args)
        break
        default: 
            console.log(chalk.red('awsmobile ' + _featureName + ' does NOT recognize the command: ' + command))
        break
    }
}

function commandConsole(projectInfo, args){
    if(projectInfo.AppsyncConsoleUrl && projectInfo.AppsyncConsoleUrl.length > 0){
        console.log(chalk.green(projectInfo.AppsyncConsoleUrl))
        opn(projectInfo.AppsyncConsoleUrl, {wait: false})
    }else{
        console.log(chalk.red('can not locate the appsync console url'))
        console.log(chalk.gray('# to retrieve the latest details of the backend awsmobile project'))
        console.log('    $ awsmobile pull')
    }
}

function commandTest(projectInfo, args){
    appsyncUpdate.runTest(projectInfo, args)
}

function onFeatureTurnOn(projectInfo, backendProjectSpec){
    try{
        appsyncManager.enable(projectInfo.ProjectPath)
        const projectFeatureOps = require(pathManager.getProjectFeatureOpsFilePath(_featureName))
        projectFeatureOps.onFeatureTurnOn(projectInfo)
    }catch(e){
        console.log(chalk.red(_featureName + ' onFeatureTurnOn error:'))
        console.log(e)
    }
}

function onFeatureTurnOff(projectInfo, backendProjectSpec){
    try{
        appsyncManager.disable(projectInfo.ProjectPath)
        const projectFeatureOps = require(pathManager.getProjectFeatureOpsFilePath(_featureName))
        projectFeatureOps.onFeatureTurnOff(projectInfo)
    }catch(e){
        console.log(chalk.red(_featureName + ' onFeatureTurnOff error:'))
        console.log(e)
    }
}

function build(projectInfo, backendProject, callback){
    if(callback){
        callback(false)
    }
}

function preBackendUpdate(projectInfo, awsDetails, backendProjectDetails, callback) {
    if(callback){
        callback()
    }
}

function createApi(projectInfo, awsDetails, callback) {
    appsyncCreate.run(projectInfo, awsDetails).then(()=>{
        if(callback){
            callback()
        }
    })
}

function retrieveApi(projectInfo, awsDetails, callback) {
    appsyncRetrieve.run(projectInfo, awsDetails).then(()=>{
        if(callback){
            callback()
        }
    })
}

function updateApi(projectInfo, awsDetails, callback) {
    if(projectInfo.AppsyncApiId){
        appsyncUpdate.run(projectInfo, awsDetails).then(()=>{
            if(callback){
                callback()
            }
        })
    }else{
        appsyncCreate.run(projectInfo, awsDetails).then(()=>{
            if(callback){
                callback()
            }
        })
    }
}

function deleteApi(projectInfo, awsDetails, callback) {
    appsyncDelete.run(projectInfo, awsDetails).then(()=>{
        if(callback){
            callback()
        }
    })
}

//////////////////// sync backend project ////////////////////
function syncCurrentBackendInfo(projectInfo, backendDetails, awsDetails, callback){
    appsyncRetrieve.run(projectInfo, awsDetails).then(()=>{
        if(callback){
            callback()
        }
    })
}

function syncToDevBackend(projectInfo, backendProject, enabledFeatures){
    let currentFeatureInfoDirPath = pathManager.getCurrentBackendFeatureDirPath(projectInfo.ProjectPath, _featureName)
    let backendFeatureDirPath = pathManager.getBackendFeatureDirPath(projectInfo.ProjectPath, _featureName)
    if(fs.existsSync(currentFeatureInfoDirPath)){
        fs.ensureDirSync(backendFeatureDirPath)
        //resolver-mappings
        let srcResolverMappingsDirPath = path.join(currentFeatureInfoDirPath, awsmobileJSConstant.AppsyncResolverMappingsDirName)
        let desResolverMappingsDirPath = path.join(backendFeatureDirPath, awsmobileJSConstant.AppsyncResolverMappingsDirName)
        if(fs.existsSync(srcResolverMappingsDirPath)){
            fs.copySync(srcResolverMappingsDirPath, desResolverMappingsDirPath)
        }
        //apiKeys
        let srcApiKeysFilePath = path.join(currentFeatureInfoDirPath, awsmobileJSConstant.AppsyncApiKeysFileName)
        let desApiKeysFilePath = path.join(backendFeatureDirPath, awsmobileJSConstant.AppsyncApiKeysFileName)
        let apiKeys = dfOps.readJsonFile(srcApiKeysFilePath)
        if(apiKeys && apiKeys.length > 0){
            apiKeysHelper.dressForDevBackend(apiKeys)
            dfOps.writeJsonFile(desApiKeysFilePath, apiKeys)
        }
        //dataSources.json
        let srcDataSourcesFilePath = path.join(currentFeatureInfoDirPath, awsmobileJSConstant.AppsyncDataSourcesFileName)
        let desDataSourcesFilePath = path.join(backendFeatureDirPath, awsmobileJSConstant.AppsyncDataSourcesFileName)
        let dataSources = dfOps.readJsonFile(srcDataSourcesFilePath)
        if(dataSources && dataSources.length > 0){
            dataSourceHelper.dressForDevBackend(dataSources)
            dfOps.writeJsonFile(desDataSourcesFilePath, dataSources)
        }
        //graphqlApi.json
        let srcGraphqlApiFilePath = path.join(currentFeatureInfoDirPath, awsmobileJSConstant.AppsyncGraphqlApiFileName)
        let desGraphqlApiFilePath = path.join(backendFeatureDirPath, awsmobileJSConstant.AppsyncGraphqlApiFileName)
        let gaphqlApi = dfOps.readJsonFile(srcGraphqlApiFilePath)
        if(gaphqlApi){
            graphqlHelper.dressForDevBackend(gaphqlApi)
            dfOps.writeJsonFile(desGraphqlApiFilePath, gaphqlApi)
        }
        //resolvers.json
        let srcResolversFilePath = path.join(currentFeatureInfoDirPath, awsmobileJSConstant.AppsyncResolversFileName)
        let desResolversFilePath = path.join(backendFeatureDirPath, awsmobileJSConstant.AppsyncResolversFileName)
        let resolvers = dfOps.readJsonFile(srcResolversFilePath)
        if(resolvers && resolvers.length > 0){
            resolversHelper.dressForDevBackend(resolvers)
            dfOps.writeJsonFile(desResolversFilePath, resolvers)
        }
        //schema.graphql
        let srcSchemaFilePath = path.join(currentFeatureInfoDirPath, awsmobileJSConstant.AppsyncSchemaFileName)
        let desSchemaFilePath = path.join(backendFeatureDirPath, awsmobileJSConstant.AppsyncSchemaFileName)
        if(fs.existsSync(srcSchemaFilePath)){
            fs.copySync(srcSchemaFilePath, desSchemaFilePath)
        }
    }
}

module.exports = {
    featureName: _featureName,
    featureCommands: _featureCommands,
    specify,
    hasCommand,
    runCommand,
    onFeatureTurnOn,
    onFeatureTurnOff,
    build,
    createApi,
    retrieveApi,
    updateApi,
    deleteApi,
    preBackendUpdate,
    syncCurrentBackendInfo,
    syncToDevBackend
}
  