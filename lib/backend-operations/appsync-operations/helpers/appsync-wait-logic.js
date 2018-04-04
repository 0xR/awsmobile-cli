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
const ora = require('ora')
const chalk = require('chalk')

const awsClient = require('../../../aws-operations/aws-client.js')

const maxCloudApiWaitLoop = 100 //each wait is 5 seconds

function waitForSchemaCreation(handle, apiId, callback){
    if(isWaitNeeded(handle)){
        let appsyncClient = awsClient.AppSync(handle.awsDetails)
        let param = {
            apiId: apiId,
        }
        schemaCreationWaitLoop(appsyncClient, param, handle, 1, callback)
    }else{
        callback(null, handle)
    }
}

// const spinner = ora('waiting ... ') //do not move inside function, the function is called recursively
function schemaCreationWaitLoop(appsyncClient, param, handle, loopCount, callback){
    // spinner.start()
    if(loopCount > maxCloudApiWaitLoop){
        // spinner.stop()
        console.log(chalk.red('exceeded wait limit'))
        callback({code: maxCloudApiWaitLoop}, handle)
    }else{
        appsyncClient.getSchemaCreationStatus(param, (err, data)=>{
            // spinner.stop()
            if(err){
                console.log(chalk.red('wait interrupted'))
                console.log(err)
                callback({code: 2}, backendDetails)
            }else{
                handle.schemaCreationResponse = data
                if(isWaitNeeded(handle)){
                    // spinner.start('status check #' + chalk.blue(loopCount) + ': ' + handle.schemaCreationResponse.status)
                    setTimeout(function(){
                        schemaCreationWaitLoop(appsyncClient, param, handle, loopCount + 1, callback)
                    }, 5000)
                }else if(handle.schemaCreationResponse.status == 'FAILED'){
                    callback({code: 1}, handle)
                }else{
                    callback(null, handle)
                }
            }
        })
    }
}

function isWaitNeeded(handle){ 
    let isWaitNeeded = false

    if(handle.schemaCreationResponse && 
        handle.schemaCreationResponse.status != 'SUCCESS' &&
        handle.schemaCreationResponse.status != 'FAILED'){
        isWaitNeeded = true
    }
    
    return isWaitNeeded
}

module.exports = {
    waitForSchemaCreation
}
