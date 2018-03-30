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
const DIFF = awsmobileJSConstant.DiffMark
const CREATE = awsmobileJSConstant.DiffMark_Create
const UPDATE = awsmobileJSConstant.DiffMark_Update
const NONE = awsmobileJSConstant.DiffMark_None
const DELETE = awsmobileJSConstant.DiffMark_Delete

function dressForDevBackend(table){
    delete table.TableStatus
    delete table.CreationDateTime
    delete table.TableSizeBytes
    delete table.ItemCount
    delete table.TableArn
    delete table.TableId
    if(table.ProvisionedThroughput){
        delete table.ProvisionedThroughput.NumberOfDecreasesToday
    }
    if(table.LocalSecondaryIndexes){
        table.LocalSecondaryIndexes.forEach(LocalSecondaryIndex=>{
            delete LocalSecondaryIndex.IndexSizeBytes
            delete LocalSecondaryIndex.ItemCount
            delete LocalSecondaryIndex.IndexArn
        })
    }
    if(table.GlobalSecondaryIndexes){
        table.GlobalSecondaryIndexes.forEach(GlobalSecondaryIndex=>{
            delete GlobalSecondaryIndex.IndexSizeBytes
            delete GlobalSecondaryIndex.ItemCount
            delete GlobalSecondaryIndex.IndexArn
            if(GlobalSecondaryIndex.ProvisionedThroughput){
                delete GlobalSecondaryIndex.ProvisionedThroughput.NumberOfDecreasesToday
            }
        })
    }
}

function diff(appsyncUpdateHandle){
}

module.exports = {
    dressForDevBackend, 
    diff
}
