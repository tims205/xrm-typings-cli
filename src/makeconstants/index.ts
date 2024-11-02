import { IEntityDefinition, RetrieveMultipleResponse } from "../models/DataverseTypes.js";
import { GenerateAuthRequest } from "../models/GenerateAuthRequest.js";
import { XrmTypingsCLIRequest } from "../models/XrmTypingsCLIRequest.js";
import { GenerateAuthToken } from "../utils/GetAuthToken.js";
import * as dom from "dts-dom";
import { promises } from "fs";
import { camelize, pascalize } from "../utils/ExtensionMethods.js";
import { constants } from "fs/promises";

export class ConstantRecordsGenerator {
    private _accessToken: string | null = null;
    private _constantRecordsRequest: XrmTypingsCLIRequest;

    constructor(constantRecordsRequest: XrmTypingsCLIRequest) {
        this._constantRecordsRequest = constantRecordsRequest;
    }

    public async Connect() {
        const generateAuthRequest: GenerateAuthRequest = {
            appId: this._constantRecordsRequest.appId,
            orgUrl: this._constantRecordsRequest.orgUrl,
            localhostPort: this._constantRecordsRequest.port
        }
        const token = await GenerateAuthToken(generateAuthRequest);
        this._accessToken = token;
    }

    public async GenerateRecordConstants() {
        if (this._accessToken == null) {
            throw Error("Access token is empty");
        }

        for (const entity of this._constantRecordsRequest.entityNames) {
            // Query entity metadata to get the id and name attributes
console.log(`Generating constants for all instances of '${entity}'`);

            const entityDefinition = await this.GetEntityDefinition(entity);

            const camelizedEntityName = camelize(entity);

            // Select records
            // TODO Page through result sets or raise an error if there is a silly number of records
            const records = await this.GetAllRecords(entityDefinition);

            const nsXrm = dom.create.namespace(`${this._constantRecordsRequest.namespace}`);
           
            const recordsEnum = dom.create.enum(`${camelizedEntityName}_Constants`, true, dom.DeclarationFlags.Export);
            nsXrm.members.push(recordsEnum);

            for (const record of records) {
                recordsEnum.members.push(dom.create.enumValue(record.name, record.id));
            }

             // Check that the output directory exists
             try {
                await promises.access(`./${this._constantRecordsRequest.outputDirectory}`, constants.F_OK)
            } catch (error) {
                await promises.mkdir(`./${this._constantRecordsRequest.outputDirectory}`)
            }

            console.log(`Writing File /${this._constantRecordsRequest.outputDirectory}/${camelizedEntityName}_constants.d.ts`);
            await promises.writeFile(`./${this._constantRecordsRequest.outputDirectory}/${camelizedEntityName}_constants.d.ts`, dom.emit(nsXrm));;
        }
    }

    private async GetEntityDefinition(entitySchemaName: string): Promise<Pick<IEntityDefinition, "LogicalName" | "EntitySetName" | "PrimaryIdAttribute" | "PrimaryNameAttribute">> {
        // Query entity metadata to get the id and name attributes
        try {
            const getEntityResponse = await fetch(`${this._constantRecordsRequest.orgUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entitySchemaName.toLowerCase().trim()}')?$select=LogicalName,PrimaryNameAttribute,PrimaryIdAttribute,EntitySetName`, {    //   ?$filter=LogicalName eq '${entitySchemaName.toLowerCase().trim()}?$select=LogicalName,PrimaryNameAttribute,PrimaryIdAttribute'`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this._accessToken}`
                }
            });

            if (getEntityResponse.ok) {
                const entityData = await getEntityResponse.json() as Pick<IEntityDefinition, "LogicalName" | "EntitySetName" | "PrimaryIdAttribute" | "PrimaryNameAttribute">;

                return entityData;
            } else {
                throw new Error(getEntityResponse.statusText);
            }


        } catch (error) {
            throw error;

        }
    }

    private async GetAllRecords(entityDefinition: Pick<IEntityDefinition, "LogicalName" | "EntitySetName" | "PrimaryIdAttribute" | "PrimaryNameAttribute">) {


        try {
            const getRecordsResponse = await fetch(`${this._constantRecordsRequest.orgUrl}/api/data/v9.2/${entityDefinition.EntitySetName}?$select=${entityDefinition.PrimaryIdAttribute},${entityDefinition.PrimaryNameAttribute}&$orderby=${entityDefinition.PrimaryNameAttribute}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this._accessToken}`
                }
            });

            if (getRecordsResponse.ok) {
                const response = await getRecordsResponse.json() as RetrieveMultipleResponse;

                return response.value.map((e) => {
                    return {
                        name: camelize(e[entityDefinition.PrimaryNameAttribute]),
                        id: e[entityDefinition.PrimaryIdAttribute]
                    }
                });
            }
            else {
                throw new Error(getRecordsResponse.statusText);
            }
        } catch (error) {
            throw error;
        }

    }
}