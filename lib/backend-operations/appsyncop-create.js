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
const moment = require('moment')
const _ = require('lodash')

const _featureName = 'appsync'

const appsyncManager = require('./appsync-manager.js')
const awsClient = require('../aws-operations/aws-client.js')
const pathManager = require('../utils/awsmobilejs-path-manager.js')
const dfOps = require('../utils/directory-file-ops.js')

const authTypes = ["API_KEY", "AWS_IAM", "AMAZON_COGNITO_USER_POOLS"]

function run(projectInfo, awsDetails){

  let featureDirPath = pathManager.getBackendFeatureDirPath(projectInfo.ProjectPath, _featureName)
  let settings = appsyncManager.getSettings(ProjectPath)

  let appsyncCreationHandle = {
    projectInfo,
    awsDetails,
    featureDirPath,
    settings
  }
  
  return createDDBTables(appsyncCreationHandle)
          .then(createLambdaFunction)
          .then(createServiceRole)
          .then(createGraphqlApi)
          .then(startSchemaCreation)
          .then(createDataSources)
          .then(createResolvers)
          .then(createApiKey)
          .then(onSuccess)
          .catch(onFailure)
}

function createDDBTables(appsyncCreationHandle){
  let createTableTasks = []
  appsyncCreationHandle.settings.DataSources.forEach(dataSource => {
    if(dataSource.type == 'AMAZON_DYNAMODB'){
      let spec = appsyncManager.getDynamoDBSpec(appsyncCreationHandle.projectInfo.ProjectPath, dataSource.name)
      createTableTasks.push(createDDBTable(appsyncCreationHandle, spec))
    }
  })
  return new Promise.all(createTableTasks).then((values)=>{
    return appsyncCreationHandle
  })
}

function createDDBTable(appsyncCreationHandle, spec){
  return new Promise((resolve, reject) => {
    let param = spec
    let dynamoDBClient = awsClient.DynamoDB(appsyncCreationHandle.awsDetails)

    dynamoDBClient.createTable(param, (err, data)=>{
      if(err){
        console.log(chalk.red('Failed to create dynamoDB table ' + spec.name))
        console.log(err)
        reject(err)
      }else{
        appsyncCreationHandle.createDDBTableResponse[spec.name] = data
        resolve(appsyncCreationHandle)
      }
    })
  })
}

function createLambdaFunction(appsyncCreationHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncCreationHandle)
  })
}

function createServiceRole(appsyncCreationHandle){
  return new Promise((resolve, reject) => {
    //todo: use IAM client to create a service role, and use it to access all the data sources
    appsyncCreationHandle.createServiceRoleResponse.serviceRoleArn = undefined
    resolve(appsyncCreationHandle)
  })
}

function createGraphqlApi(appsyncCreationHandle){
  return new Promise((resolve, reject) => {
    let param = {
      name: appsyncCreationHandle.settings.APIName,
      authenticationType: 'API_KEY'
    }
    let appsyncClient = awsClient.AppSync(appsyncCreationHandle.awsDetails)

    appsyncClient.createGraphqlApi(param, (err, data)=>{
      if(err){
        console.log(err)
        reject(err)
      }else{
        appsyncCreationHandle.createGraphqlApiResponse = data
        resolve(appsyncCreationHandle)
      }
    })
  })
}

function startSchemaCreation(appsyncCreationHandle){
  return new Promise((resolve, reject) => {
    let param = {
      apiId:  appsyncCreationHandle.createGraphqlApiResponse.graphqlApi.apiId,
      definition: fs.readFileSync(path.join(appsyncCreationHandle.featureDirPath, 'schema.graphql'))
    }
    let appsyncClient = awsClient.AppSync(appsyncCreationHandle.awsDetails)
    appsyncClient.startSchemaCreation(param, (err, data)=>{
      if(err){
        console.log(err)
        reject(err)
      }else{
        appsyncCreationHandle.startSchemaCreationResponse = data
        resolve(appsyncCreationHandle)
      }
    })
  })
}

function createDataSources(appsyncCreationHandle){
  let createDataSourceTasks = []
  appsyncCreationHandle.settings.DataSources.forEach(dataSource => {
    createDataSourceTasks.push(createDataSource(appsyncCreationHandle, dataSource))
  })
  return new Promise.all(createDataSourceTasks).then((values)=>{
    return appsyncCreationHandle
  })
}

function createDataSource(appsyncCreationHandle, dataSource){
  return new Promise((resolve, reject) => {
    let param = {
      apiId: appsyncCreationHandle.createGraphqlApiResponse.graphqlApi.apiId,
      name: dataSource.name,
      description: dataSource.description,
      type: dataSource.type,
      serviceRoleArn: appsyncCreationHandle.createServiceRoleResponse.serviceRoleArn,
      dynamodbConfig: getDynamodbConfig(appsyncCreationHandle, dataSource),
      lambdaConfig: getLambdaConfig(appsyncCreationHandle, dataSource),
      elasticsearchConfig: getElasticsearchConfig(appsyncCreationHandle, dataSource),
    }

    let appsyncClient = awsClient.AppSync(appsyncCreationHandle.awsDetails)

    appsyncClient.createDataSource(param, (err, data)=>{
      if(err){
        console.log(err)
        reject(err)
      }else{
        appsyncCreationHandle.createDataSourceResponse[dataSource.name] = data
        resolve(appsyncCreationHandle)
      }
    })
  })
}

function getDynamodbConfig(appsyncCreationHandle, dataSource){
  let config = {
    tableName: appsyncCreationHandle.createDDBTableResponse[dataSource.name].TableName,
    awsRegion: appsyncCreationHandle.awsDetails.config.region,
    /**
     * Set to TRUE to use Amazon Cognito credentials with this data source.
     */
    useCallerCredentials: false
  }

  return config
}

function getLambdaConfig(appsyncCreationHandle, dataSource){
  return undefined
}

function getElasticsearchConfig(appsyncCreationHandle, dataSource){
  return undefined
}

function createResolvers(appsyncCreationHandle){
  let createResolverTasks = []
  appsyncCreationHandle.settings.Resolvers.forEach(resolver => {
    createResolverTasks.push(createResolver(appsyncCreationHandle, resolver))
  })
  return new Promise.all(createResolverTasks).then((values)=>{
    return appsyncCreationHandle
  })
}

function createResolver(appsyncCreationHandle, resolver){
  return new Promise((resolve, reject) => {
    let param = {
      apiId: appsyncCreationHandle.createGraphqlApiResponse.graphqlApi.apiId,
      typeName: resolver.typeName,
      fieldName: resolver.fieldName,
      dataSourceName: resolver.dataSourceName,
      requestMappingTemplate: appsyncManager.getMapping(appsyncCreationHandle.projectInfo.ProjectPath, resolver.requestMappingTemplate),
      responseMappingTemplate: appsyncManager.getMapping(appsyncCreationHandle.projectInfo.ProjectPath, resolver.responseMappingTemplate)
    }

    let appsyncClient = awsClient.AppSync(appsyncCreationHandle.awsDetails)

    appsyncClient.createResolver(param, (err, data)=>{
      if(err){
        console.log(err)
        reject(err)
      }else{
        appsyncCreationHandle.createDDBResponse[resolver.fieldName] = data
        resolve(appsyncCreationHandle)
      }
    })
  })
}

function createApiKey(appsyncCreationHandle){
  return new Promise((resolve, reject) => {
    let param = {
      apiId:  appsyncCreationHandle.createGraphqlApiResponse.graphqlApi.apiId
    }
    let appsyncClient = awsClient.AppSync(appsyncCreationHandle.awsDetails)

    appsyncClient.createApiKey(param, (err, data)=>{
      if(err){
        console.log(err)
        reject(err)
      }else{
        appsyncCreationHandle.createApiKeyResponse = data
        resolve(appsyncCreationHandle)
      }
    })
  })
}

function getExportJS(appsyncCreationHandle){
  return new Promise((resolve, reject) => {
    resolve(appsyncCreationHandle)
  })
}

function onSuccess(appsyncCreationHandle){
  appsyncManager.setAppSyncJS(appsyncCreationHandle.projectInfo.ProjectPath, constructAppSyncJS(appsyncCreationHandle))
  console.log('appsync creation done')
}

function onFailure(e){
  console.log(chalk.red('appsync creation failed'))
  console.log(e)
}

function constructAppSyncJS(appsyncCreationHandle)
{
  let result = {}

  result.graphqlEndpoint = appsyncCreationHandle.createGraphqlApiResponse.graphqlApi.uris.GRAPHQL
  result.region = appsyncCreationHandle.awsDetails.config.region
  result.authenticationType = appsyncCreationHandle.createGraphqlApiResponse.graphqlApi.authenticationType
  result.apiKey = appsyncCreationHandle.createApiKeyResponse.apiKey.id

  return result
}

module.exports = {
  run
}
