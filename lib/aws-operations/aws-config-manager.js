/* 
 * Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
const fs = require('fs-extra')
const opn = require('opn')
const chalk = require('chalk')
const inquirer = require('inquirer')
const lineByLine = require('n-readlines')
const util = require('util')

const awsMobileRegions = require('./aws-regions.js').regions
const awsConfigManagerBase = require('./aws-config-manager-base.js')
const projectInfoManager = require('../project-info-manager.js')
const awsmobileJSConstant = require('../utils/awsmobilejs-constant.js')
const nameManager = require('../utils/awsmobilejs-name-manager.js')
const pathManager = require('../utils/awsmobilejs-path-manager.js')
const dfops = require('../utils/directory-file-ops.js')


function initialize(projectInfo){ 
    if(projectInfo){
        let awsInfo = {}
       
        awsInfo.ConfigFileName = nameManager.generateAWSConfigFileName(projectInfo)

        const jsonString = JSON.stringify(awsInfo, null, '\t')

        const awsInfoFilePath = pathManager.getAwsInfoFilePath(projectPath)

        fs.writeFileSync(awsInfoFilePath, jsonString, 'utf8')
    }
    return resolveAWSConfig(projectInfo)
}

function checkAWSConfig(projectInfo, callback){
    let awsConfig = resolveAWSConfig(projectInfo)
    if(validateAWSConfig(awsConfig)){
        callback(awsConfig)
    }else{
        console.log(chalk.red('missing aws account credentials'))
        inquirer.prompt([
            {
                type: 'confirm',
                name: 'configureAWS',
                message: 'configure aws account settings',
                default: true
            }
        ]).then(function (answers) {
            if(answers.configureAWS){
                configureAWS(function(awsConfig){
                    if(validateAWSConfig(awsConfig)){
                        callback(awsConfig)
                    }else{
                        console.log(chalk.red('invalid aws account settings'))
                        opn(awsmobileJSConstant.AWSCreateIAMUsersUrl, {wait: false})
                    }
                })
            }
        })
    }
}

function configureAWS(profileName, callback)
{
    let projectInfo = projectInfoManager.getProjectInfo()
    if(projectInfo){
        let awsConfigFilePath = pathManager.getAWSConfigFilePath()
        let awsConfig = resolveAWSConfig()
    
        let isNewUser = false
        if(!validateAWSConfig(awsConfig)){ //assume new user
            isNewUser = true
            console.log('visit the following address to setup your aws account/user credentials:')
            console.log(chalk.green(awsmobileJSConstant.AWSCreateIAMUsersUrl))
            opn(awsmobileJSConstant.AWSCreateIAMUsersUrl, {wait: false})
        }
    
        inquirer.prompt([
            {
                type: 'input',
                name: 'accessKeyId',
                message: "accessKeyId: ",
                default: awsConfig.accessKeyId
            },
            {
                type: 'input',
                name: 'secretAccessKey',
                message: "secretAccessKey: ",
                default: awsConfig.secretAccessKey
            },
            {
                type: 'list',
                name: 'region',
                message: "region: ",
                choices: awsMobileRegions,
                default: awsConfig.region
            }
        ]).then(function (answers) {
            if(answers.accessKeyId){
                awsConfig.accessKeyId = answers.accessKeyId.trim()
            }
            if(answers.secretAccessKey){
                awsConfig.secretAccessKey = answers.secretAccessKey.trim()
            }
            if(answers.region){
                awsConfig.region = answers.region.trim()
            }
            let jsonString = JSON.stringify(awsConfig)
            fs.writeFileSync(awsConfigFilePath, jsonString, 'utf8')
    
            if(isNewUser){
                console.log()
                console.log('You must enable Mobile Hub service role before using the awsmobile cli')
                console.log('If you see Mobile Hub console, then it is already enabled')
                console.log(chalk.green(awsmobileJSConstant.AWSEnableMobileRoleUrl))
                opn(awsmobileJSConstant.AWSEnableMobileRoleUrl, {wait: false})
            }
    
            if(callback){
                callback(awsConfig)
            }
        })
    }else{
        console.log('configure aws for ' + chalk.blue('awsmobile init'))
        awsConfigManagerBase.configureAWS(profileName, callback)
    }
}

function listAWSConfig(){
    let projectInfo = projectInfoManager.getProjectInfo()
    if(projectInfo){
        console.log()
        console.log(util.inspect(resolveAWSConfig(projectInfo), false, null))
        console.log()
    }else{
        console.log('list aws configuration for ' + chalk.blue('awsmobile init'))
        awsConfigManagerBase.configureAWS(profileName, callback)
    }
}

function resolveAWSConfig(projectInfo){
    let awsConfig
    try{
        let awsConfigFilePath = pathManager.getAWSConfigFilePath() 
        if(fs.existsSync(awsConfigFilePath)){
            try{
                awsConfig = JSON.parse(fs.readFileSync(awsConfigFilePath, 'utf8'))
                if(!validateAWSConfig(awsConfig)){
                    awsConfig = resetToSystemAWSConfig()
                }
            }catch(e){
                awsConfig = resetToSystemAWSConfig()
            }
        }else{
            awsConfig = resetToSystemAWSConfig()
        }
    }catch(e){
        let awsConfig = new Object()
        awsConfig.accessKeyId = awsmobileJSConstant.DefaultAWSAccessKeyId
        awsConfig.secretAccessKey = awsmobileJSConstant.DefaultAWSSecretAccessKey
        awsConfig.region = awsmobileJSConstant.DefaultAWSRegion
    }
    return awsConfig
}

function resetToSystemAWSConfig(){
    let awsConfig = getSystemAwsConfig()
    
    let sysAWSMobileJSDirPath = pathManager.getSysAWSMobileJSDirPath()
    if(!fs.existsSync(sysAWSMobileJSDirPath)){
        fs.mkdirsSync(sysAWSMobileJSDirPath)
    }

    let awsConfigFilePath = pathManager.getAWSConfigFilePath() 
    let jsonString = JSON.stringify(awsConfig)
    fs.writeFileSync(awsConfigFilePath, jsonString, 'utf8')

    return awsConfig
}

function validateAWSConfig(awsConfig){
    return validateAccessKeyID(awsConfig.accessKeyId) &&
    validateSecretAccessKey(awsConfig.secretAccessKey) &&
    validateAWSRegion(awsConfig.region)
}

function validateAccessKeyID(accessKeyId){
    return (accessKeyId && accessKeyId != awsmobileJSConstant.DefaultAWSAccessKeyId)
}

function validateSecretAccessKey(secretAccessKey){
    return (secretAccessKey && secretAccessKey != awsmobileJSConstant.DefaultAWSSecretAccessKey)
}

function validateAWSRegion(region){
    return awsMobileRegions.includes(region)
}

function getSystemAwsConfig(){
    awsConfig = new Object()
    let sysCredential = readSystemAwsCredential()
    if(sysCredential){
        awsConfig.accessKeyId = sysCredential.aws_access_key_id
        awsConfig.secretAccessKey = sysCredential.aws_secret_access_key
    }else{
        awsConfig.accessKeyId = awsmobileJSConstant.DefaultAWSAccessKeyId
        awsConfig.secretAccessKey = awsmobileJSConstant.DefaultAWSSecretAccessKey
    }

    let sysConfig = readSystemAwsConfig()

    if(sysConfig){
        awsConfig.region = sysConfig.region
    }else{
        awsConfig.region = awsmobileJSConstant.DefaultAWSRegion
    }
    return awsConfig
}

function readSystemAwsConfig()
{
    let result
    
    try{
        let liner = new lineByLine(pathManager.getSysAwsConfigFilePath())
        result = {}
        let line
        let isInDefault = false
        while (line = liner.next()) {
            let strPair = line.toString().split("=")
            if(strPair.length == 1){
                if(line == '[default]'){
                    isInDefault = true
                }else{
                    isInDefault = false
                }
            }else if (strPair.length == 2){
                if(isInDefault){
                    result[strPair[0].trim()] = strPair[1].trim()
                }
            }
        }
    }catch(e){
        result = undefined
    }

    return result
}

function readSystemAwsCredential()
{
    let result
    try{
        let liner = new lineByLine(pathManager.getSysAwsCredentialsFilePath())
        result = {}
        let line
        let isInDefault = false
        while (line = liner.next()) {
            let strPair = line.toString().split("=")
            if(strPair.length == 1){
                if(line == '[default]'){
                    isInDefault = true
                }else{
                    isInDefault = false
                }
            }else if (strPair.length == 2){
                if(isInDefault){
                    result[strPair[0].trim()] = strPair[1].trim()
                }
            }
        }
    }catch(e){
        result = undefined
    }
    return result
}

module.exports = {
    initialize,
    checkAWSConfig,
    configureAWS,
    listAWSConfig
}
  