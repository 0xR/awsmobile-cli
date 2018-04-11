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
const deepEqual = require('deep-equal')
const dataSourceType = ["AWS_LAMBDA", "AMAZON_DYNAMODB", "AMAZON_ELASTICSEARCH"]
const awsmobilejsConstant = require('../../../utils/awsmobilejs-constant.js')
const DIFF = awsmobilejsConstant.DiffMark
const CREATE = awsmobilejsConstant.DiffMark_Create
const UPDATE = awsmobilejsConstant.DiffMark_Update
const NONE = awsmobilejsConstant.DiffMark_None
const DELETE = awsmobilejsConstant.DiffMark_Delete

function constructCreateParam(table){
    let param = {}
    if(table.AttributeDefinitions){
        param.AttributeDefinitions = table.AttributeDefinitions
    }
    if(table.TableName){
        param.TableName = table.TableName
    }
    if(table.KeySchema){
        param.KeySchema = table.KeySchema
    }
    if(table.LocalSecondaryIndexes){
        param.LocalSecondaryIndexes = table.LocalSecondaryIndexes
    }
    if(table.GlobalSecondaryIndexes){
        param.GlobalSecondaryIndexes = table.GlobalSecondaryIndexes
    }
    if(table.ProvisionedThroughput){
        param.ProvisionedThroughput = table.ProvisionedThroughput
    }
    if(table.StreamSpecification){
        param.StreamSpecification = table.StreamSpecification
    }
    if(table.SSESpecification){
        param.SSESpecification = table.SSESpecification
    }
    dressForDevBackend(param)
    return param
}

function constructUpdateParam(table){
    let param = {}
    if(table.AttributeDefinitions){
        param.AttributeDefinitions = table.AttributeDefinitions
    }
    if(table.TableName){
        param.TableName = table.TableName
    }
    if(table.ProvisionedThroughput){
        let ReadCapacityUnits = table.ProvisionedThroughput.ReadCapacityUnits
        let WriteCapacityUnits = table.ProvisionedThroughput.WriteCapacityUnits
        param.ProvisionedThroughput = {
            ReadCapacityUnits: ReadCapacityUnits? ReadCapacityUnits: 5,
            WriteCapacityUnits: WriteCapacityUnits? WriteCapacityUnits: 5
        }
    }
    if(table.GlobalSecondaryIndexUpdates){
        param.GlobalSecondaryIndexUpdates = table.GlobalSecondaryIndexUpdates
    }
    if(table.StreamSpecification){
        param.StreamSpecification = table.StreamSpecification
    }
    return param
}


function dressForDevBackend(table){
    delete table.TableStatus
    delete table.CreationDateTime
    delete table.TableSizeBytes
    delete table.ItemCount
    delete table.TableArn
    delete table.TableId
    delete table.LatestStreamLabel
    delete table.LatestStreamArn
    delete table.RestoreSummary

    if(table.ProvisionedThroughput){
        delete table.ProvisionedThroughput.NumberOfDecreasesToday
        delete table.ProvisionedThroughput.LastDecreaseDateTime
        delete table.ProvisionedThroughput.LastIncreaseDateTime
    }

    if(table.SSEDescription){
        table.SSESpecification = {
           Enabled: (table.SSEDescription.Status == "ENABLING" || table.SSEDescription.Status == "ENABLED")
        }
        delete table.SSEDescription
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
            delete GlobalSecondaryIndex.IndexStatus
            delete GlobalSecondaryIndex.Backfilling
            delete GlobalSecondaryIndex.IndexSizeBytes
            delete GlobalSecondaryIndex.ItemCount
            delete GlobalSecondaryIndex.IndexArn
            if(GlobalSecondaryIndex.ProvisionedThroughput){
                delete GlobalSecondaryIndex.ProvisionedThroughput.NumberOfDecreasesToday
                delete GlobalSecondaryIndex.ProvisionedThroughput.LastDecreaseDateTime
                delete GlobalSecondaryIndex.ProvisionedThroughput.LastIncreaseDateTime
            }
        })
    }
    return table
}

function diff(appsyncUpdateHandle){
    let diffMarkedTables = []
    let currentTables = appsyncUpdateHandle.currentAppSyncInfo.dataSources.tables
    let devTables = appsyncUpdateHandle.devAppSyncInfo.dataSources.tables
    if(devTables && devTables.length>0){
        for(let i=0;i<devTables.length; i++){
            let devTable = devTables[i]
            let currentTable
            if(currentTables && currentTables.length>0){
                for(let j=0;j<currentTables.length; j++){
                    if(currentTables[j].TableName==devTable.TableName &&
                        currentTables[j].Region==devTable.Region){
                        currentTable = currentTables[j]
                        break
                    }
                }
            }
            diffMarkedTables.push(markDiff(devTable, currentTable))
        }
    }
    if(currentTables && currentTables.length>0){
        for(let j=0;j<currentTables.length; j++){
            if(!currentTables[j][DIFF]){
                diffMarkedTables.push(markDiff(undefined, currentTables[j]))
            }
        }
    }
    diffMarkedTables = diffMarkedTables.filter(item=>item[DIFF] != NONE)
    return diffMarkedTables
}

function markDiff(devTable, currentTable){
    let result = devTable
    if(!currentTable){
        devTable[DIFF] = CREATE
    }else if(!devTable){
        currentTable[DIFF] = DELETE
        result = currentTable
    }else{
        dressForDevBackend(currentTable)
        if(deepEqual(devTable, currentTable)){
                devTable[DIFF] = NONE
                currentTable[DIFF] = NONE
        }else{
            devTable[DIFF] = UPDATE
            currentTable[DIFF] = UPDATE
            let GlobalSecondaryIndexUpdates = constructGSIUpdates(devTable, currentTable)
            if(GlobalSecondaryIndexUpdates.length>0){
                devTable.GlobalSecondaryIndexUpdates = GlobalSecondaryIndexUpdates
            }
        }
    }
    return result
}

function constructGSIUpdates(devTable, currentTable){
    let GlobalSecondaryIndexUpdates = []
    
    let devGSIs = devTable.GlobalSecondaryIndexes
    let currentGSIs = currentTable.GlobalSecondaryIndexes

    if(devGSIs && devGSIs.length>0){
        for(let i=0;i<devGSIs.length; i++){
            let devGSI = devGSIs[i]
            let currentGSI
            if(currentGSIs && currentGSIs.length>0){
                for(let j=0;j<currentGSIs.length; j++){
                    if(currentGSIs[j].TableName==devGSI.TableName &&
                        currentGSIs[j].Region==devGSI.Region){
                        currentGSI = currentGSIs[j]
                        break
                    }
                }
            }
            let update = constructGSIUpdate(undefined, currentGSIs[j])
            if(update){
                GlobalSecondaryIndexUpdates.push(update)
            }
        }
    }
    if(currentGSIs && currentGSIs.length>0){
        for(let j=0;j<currentGSIs.length; j++){
            if(!currentGSIs[j][DIFF]){
                let update = constructGSIUpdate(undefined, currentGSIs[j])
                if(update){
                    GlobalSecondaryIndexUpdates.push(update)
                }
            }
        }
    }


    return GlobalSecondaryIndexUpdates
}

function constructGSIUpdate(devGSI, currentGSI){
    let result
    if(!currentGSI){
        devGSI[DIFF] = CREATE
        result = {
            Create: {
                IndexName: devGSI.IndexName,
                KeySchema: devGSI.KeySchema,
                Projection: devGSI.Projection
            }
        }
        if(devGSI.ProvisionedThroughput){
            let ReadCapacityUnits = devGSI.ProvisionedThroughput.ReadCapacityUnits
            let WriteCapacityUnits = devGSI.ProvisionedThroughput.WriteCapacityUnits
            result.Create.ProvisionedThroughput = {
                ReadCapacityUnits: ReadCapacityUnits? ReadCapacityUnits: 5,
                WriteCapacityUnits: WriteCapacityUnits? WriteCapacityUnits: 5
            }
        }
    }else if(!devGSI){
        currentGSI[DIFF] = DELETE
        result = {
            Delete: {
                IndexName: currentGSI.IndexName
            }
        }
    }else{
        if(deepEqual(devGSI, currentGSI)){
            devGSI[DIFF] = NONE
            currentGSI[DIFF] = NONE
        }else{
            devGSI[DIFF] = UPDATE
            currentGSI[DIFF] = UPDATE
            result = {
                Update: {
                    IndexName: devGSI.IndexName
                }
            }
            if(devGSI.ProvisionedThroughput){
                let ReadCapacityUnits = devGSI.ProvisionedThroughput.ReadCapacityUnits
                let WriteCapacityUnits = devGSI.ProvisionedThroughput.WriteCapacityUnits
                result.Update.ProvisionedThroughput = {
                    ReadCapacityUnits: ReadCapacityUnits? ReadCapacityUnits: 5,
                    WriteCapacityUnits: WriteCapacityUnits? WriteCapacityUnits: 5
                }
            }
        }
    }
    return result
}

module.exports = {
    constructCreateParam,
    constructUpdateParam,
    dressForDevBackend, 
    diff
}