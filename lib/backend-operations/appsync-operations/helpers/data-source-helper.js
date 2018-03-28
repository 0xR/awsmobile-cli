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
const awsmobileJSConstant = require('../../../utils/awsmobilejs-constant.js')
const dataSourceType = ["AWS_LAMBDA", "AMAZON_DYNAMODB", "AMAZON_ELASTICSEARCH"]

function dressForDevBackend(dataSources){
    dataSources.forEach(dataSource=>{
        delete dataSource.dataSourceArn
        delete dataSource.lambdaConfig
        delete dataSource.elasticsearchConfig
        if(dataSource.type == 'AMAZON_DYNAMODB' && dataSource.spec && dataSource.spec.Table){
            delete dataSource.spec.Table.TableStatus
            delete dataSource.spec.Table.CreationDateTime
            delete dataSource.spec.Table.TableSizeBytes
            delete dataSource.spec.Table.ItemCount
            delete dataSource.spec.Table.TableArn
            delete dataSource.spec.Table.TableId
            if(dataSource.spec.Table.ProvisionedThroughput){
                delete dataSource.spec.Table.ProvisionedThroughput.NumberOfDecreasesToday
            }
            if(dataSource.spec.Table.LocalSecondaryIndexes){
                dataSource.spec.Table.LocalSecondaryIndexes.forEach(LocalSecondaryIndex=>{
                    delete LocalSecondaryIndex.IndexSizeBytes
                    delete LocalSecondaryIndex.ItemCount
                    delete LocalSecondaryIndex.IndexArn
                })
            }
            if(dataSource.spec.Table.GlobalSecondaryIndexes){
                dataSource.spec.Table.GlobalSecondaryIndexes.forEach(GlobalSecondaryIndex=>{
                    delete GlobalSecondaryIndex.IndexSizeBytes
                    delete GlobalSecondaryIndex.ItemCount
                    delete GlobalSecondaryIndex.IndexArn
                    if(GlobalSecondaryIndex.ProvisionedThroughput){
                        delete GlobalSecondaryIndex.ProvisionedThroughput.NumberOfDecreasesToday
                    }
                })
            }
        }

        dataSource.serviceRoleArn = awsmobileJSConstant.ByAWSMobileCLI
        if(dataSource.dynamodbConfig){
            dataSource.dynamodbConfig = awsmobileJSConstant.ByAWSMobileCLI
        }
        //todo: add dress logic for lambda and elasticsearch
    })
}

module.exports = {
    dressForDevBackend
}
