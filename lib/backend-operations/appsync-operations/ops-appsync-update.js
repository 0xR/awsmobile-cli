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
const os = require('os')
const path = require('path')
const chalk = require('chalk')
const moment = require('moment')
const util = require('util')
const _ = require('lodash')

const _featureName = 'appsync'

const appsyncManager = require('./appsync-manager.js')
const serviceRoleHelper = require('./helpers/service-role-helper.js')
const appsyncWaitLogic = require('./helpers/appsync-wait-logic.js')
const appsyncRetrieve = require('./ops-appsync-retrieve.js')
const awsClient = require('../../aws-operations/aws-client.js')
const pathManager = require('../../utils/awsmobilejs-path-manager.js')
const nameManager = require('../../utils/awsmobilejs-name-manager.js')
const dfOps = require('../../utils/directory-file-ops.js')
const projectInfoManager = require('../../project-info-manager.js')
const awsmobileJSConstant = require('../../utils/awsmobilejs-constant.js')
const awsConfigManager = require('../../aws-operations/aws-config-manager.js')

function runTest(projectInfo, args){
  awsConfigManager.checkAWSConfig(function(awsDetails){
    run(projectInfo, awsDetails)
  })
}

function run(projectInfo, awsDetails){
  return appsyncRetrieve.run(projectInfo, awsDetails)
          .then(updateAppSync)
}

function updateAppSync(currentAppsyncInfo){
  console.log('appsync update:')
  console.log(util.inspect(currentAppsyncInfo))

  return diff(currentAppsyncInfo)
        .then(createDDBTables)
        .then(createServiceRoles)
        .then(putRolePolicies)
        .then(updateDDBTables)
        .then(updateGraphqlApi)
        .then(startSchemaCreation)
        .then(waitForSchemaCreationToComplete)
        .then(createDataSources)
        .then(updateDataSources)
        .then(createResolvers)
        .then(updateResolvers)
        .then(createApiKey)
        .then(updateApiKey)
        .then(onSuccess)
        .catch(onFailure)
}

function diff(currentAppsyncInfo){
  return new Promise((resolve, reject) => {
    let appsyncUpdateHandle = {
      currentAppsyncInfo
    }
    resolve(appsyncUpdateHandle)
  })
}

function createDDBTables(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function createServiceRoles(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function putRolePolicies(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function updateDDBTables(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function updateGraphqlApi(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function startSchemaCreation(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function waitForSchemaCreationToComplete(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function createDataSources(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function updateDataSources(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function createResolvers(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function updateResolvers(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function createApiKeys(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}

function updateApiKeys(appsyncUpdateHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncUpdateHandle)
  })
}


function onSuccess(appsyncRetrieveHandle){
  console.log('appsync udpate successful...')
}

function onFailure(e){
  console.log(chalk.red('appsync update failed'))
  console.log(e)
  process.exit(1)
}

module.exports = {
  run, 
  runTest
}
