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
const path = require('path')
const chalk = require('chalk')
const moment = require('moment')
const inquirer = require('inquirer')

const awsmobileBaseManager = require('../awsm-base-manager.js')
const awsmobileJSConstant = require('../utils/awsmobilejs-constant.js')

//if initInto.strategy is not set, the setup-backend step will not carry out any functions
const strategy = [
    'create', //use the default yaml to create a mobile project as the backend
    'clone', //if a valid backend spec is already in the project, create a mobile project based on it as the backend
    'link', //if a mobile project id is in the command arguments, link to it as the backend
]

function run(initInfo){
    let result = initInfo

    if(initInfo.mobileProjectID){
        initInto.strategy = 'link'
    }else{
        initInto.strategy = 'create'
    }

    switch(initInfo.initialStage){
        case 'clean-slate':
            //nothing extra
        break
        case 'invalid': 
            //nothing extra
        break
        case 'backend-valid':
            result = chooseForBackendValid(initInfo)
        break
        case 'project-info-valid':
            result = chooseForProjectInfoValid(initInfo)
        break
        case 'valid': 
            result = chooseForValid(initInfo)
        break
    }

    return result
}

function chooseForBackendValid(initInfo){
    let result = initInfo

    if(initInto.mobileProjectID){
        initInto.strategy = 'link'
    }else{ //if no mobile project id, will clone.
        initInto.strategy = 'clone'
    }

    return result
}

function chooseForProjectInfoValid(initInfo){
    let result = initInfo
    initInfo.strategy = undefined

    console.log('this project\'s backend is currently set to be ' + chalk.blud(initInfo.projectInfo.BackendProjectName))
    console.log('with mobile project id = ' + chalk.blue(initInfo.projectInfo.BackendProjectID))
    console.log('and was initialized at ' + chalk.blue(initInfo.projectInfo.InitializationTime))

    if(initInfo.mobileProjectID){
        if(initInfo.mobileProjectID != initInfo.projectInfo.BackendProjectID){
            result = confirmToSwitchBackend(initInfo).then((initInfo)=>{
                if(!initInfo.strategy){ //user declined to switch backend
                    return confirmToReEstablishBackend(initInfo)
                }else{
                    return initInfo
                }
            })
        }else{
            prepReEstablish(initInfo)
        }
    }else{
        result = chooseReEstablishOrNew(initInfo)
    }

    return result
}

function chooseForValid(initInfo){
    let result = initInfo
    initInfo.strategy = undefined

    console.log('this project\'s current backend is ' + chalk.blud(initInfo.projectInfo.BackendProjectName))
    console.log('with mobile project id = ' + chalk.blue(initInfo.projectInfo.BackendProjectID))
    console.log('and was initialized at ' + chalk.blue(initInfo.projectInfo.InitializationTime))

    if(initInfo.mobileProjectID){
        if(initInfo.mobileProjectID != initInfo.projectInfo.BackendProjectID){
            result = confirmToSwitchBackend(initInfo)
        }else{
            console.log('you have specified the same id: ' + chalk.blue(initInfo.projectInfo.BackendProjectID))
            console.log('init is aborted')
            console.log(chalk.gray('# to retrieve the latest details of the backend awsmobile project'))
            console.log('    $ awsmobile pull')
        }
    }else{
        result = confirmToCreateNewBackend(initInfo)
    }

    return result
}

function confirmToCreateNewBackend(initInfo){
    initInfo.strategy = undefined

    let question = {
        type: 'confirm',
        name: 'confirmCreateNew',
        message: 'create a new awsmobile project as the backend',
        default: false
    }

    return inquirer.prompt(question).then(function (answers) {
        if(answers.confirmCreateNew){
            prepCreateNew(initInfo)
        }
        return initInfo
    })
}

function confirmToReEstablishBackend(initInfo){
    initInfo.strategy = undefined

    let question = {
        type: 'confirm',
        name: 'confirmReEstablish',
        message: 're-establish association with the original backend awsmobile project',
        default: true
    }

    return inquirer.prompt(question).then(function (answers) {
        if(answers.confirmReEstablish){
            prepReEstablish(initInfo)
        }
        return initInfo
    })
}

function confirmToSwitchBackend(initInfo){
    initInfo.strategy = undefined

    let question = {
        type: 'confirm',
        name: 'confirmSwitch',
        message: 'switch backend to awsmobile project with id = ' + initInfo.mobileProjectID,
        default: false
    }

    return inquirer.prompt(question).then(function (answers) {
        if(answers.confirmSwitch){
            prepSwitch(initInfo)
        }
        return initInfo
    })
}

function chooseReEstablishOrNew(initInfo){
    initInfo.strategy = undefined

    let question = {
        type: 'list',
        name: 'ReEstablishOrNew',
        message: 'create a new backend or re-establish association with the original backend',
        choices: [
            {
              name: 'create a new backend',
              value: 'create'
            },
            {
              name: 're-establish association',
              value: 'reestablish'
            }
          ]
        }

    return inquirer.prompt(question).then(function (answers) {
        switch (answers.ReEstablishOrNew) {
            case 'create': 
                prepCreateNew(initInfo)
            break
            case 'reestablish': 
                prepReEstablish(initInfo)
            break
          }
        return initInfo
    })
}

function prepCreateNew(initInfo){
    console.log('init will now try to create a new backend awsmobile project')
    initInfo.strategy = 'create'
}

function prepSwitch(initInfo){
    console.log('init will now try to switch to the newly specified backend')
    initInfo.strategy = 'link'
}

function prepReEstablish(initInfo){
    console.log('init will now try to re-establish the association with the backend awsmobile project')
    initInfo.strategy = 'link'
    initInfo.mobileProjectID = initInfo.projectInfo.BackendProjectID
}

module.exports = {
    run
}
