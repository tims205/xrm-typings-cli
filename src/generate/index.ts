import { promises } from "fs";
import { IAttributeDefinition, IAttributeMetadata, IEntityDefinition, IOptionSet, IOptionSetMetadata, IOptionValue } from "../models/DataverseTypes.js";
import { attributeTypeDefMap, controlTypeDefMap } from "../models/TypeMaps.js";
import { camelize, pascalize, sanitize } from "../utils/ExtensionMethods.js";
import { GenerateAuthToken } from "../utils/GetAuthToken.js";
import * as dom from "dts-dom"
import { GenerateTypingsRequest } from "../models/GenerateTypingsRequest.js";
import { GenerateAuthRequest } from "../models/GenerateAuthRequest.js";
import { constants } from "fs/promises";

const typingNamespace: string = "Xrm";
const typingInterface: string = "EventContext";
const typingMethod: string = "getFormContext";
const typingOmitAttribute = "Omit<FormContext, 'getAttribute'>";
const typingOmitControl = "Omit<FormContext, 'getControl'>";
const xrmAttribute = "Attributes.Attribute";
const xrmControl = "Controls.StandardControl";

export class TypingsGenerator {

    private _generateTypingsRequest: GenerateTypingsRequest;
    private _accessToken: string | null = null;

    constructor(generateTypingsRequest: GenerateTypingsRequest) {

        this._generateTypingsRequest = generateTypingsRequest;
    };

    public async Connect() {
        const generateAuthRequest: GenerateAuthRequest = {
            appId: this._generateTypingsRequest.appId,
            orgUrl: this._generateTypingsRequest.orgUrl,
            localhostPort: this._generateTypingsRequest.port
        }
        const token = await GenerateAuthToken(generateAuthRequest);
        this._accessToken = token;
    }

    public async GenerateTypings() {

        if (this._accessToken == null) {
            throw Error("Access token is empty");
        }

        if (this._generateTypingsRequest.publisherPrefix !== undefined) {
            if (!this._generateTypingsRequest.publisherPrefix.endsWith("_")) {
                this._generateTypingsRequest.publisherPrefix.concat("_");
            }

            // Get all entities where the logical name starts with the publisher prefix
            const publisherPrefixEntities = await this.getEntitiesWithPublisherPrefix();
            if (publisherPrefixEntities != undefined) {
                for (const entity of publisherPrefixEntities) {
                    if (!this._generateTypingsRequest.entityNames.some((e) => e === entity.LogicalName))
                    {
                        this._generateTypingsRequest.entityNames.push(entity.LogicalName);
                    }
                }
            }
        }

        this._generateTypingsRequest.entityNames.forEach(async (entityLogicalName) => {

            console.log(`Generating typings for ${entityLogicalName}`);

            const typing = await this.getEntityTyping(entityLogicalName);

            const camelizedEntityName = camelize(entityLogicalName);

            // Check that the output directory exists
            try {
                await promises.access(`./${this._generateTypingsRequest.outputDirectory}`, constants.F_OK)
            } catch (error) {

                await promises.mkdir(`./${this._generateTypingsRequest.outputDirectory}`)
            }

            console.log(`Writing File /${this._generateTypingsRequest.outputDirectory}/${camelizedEntityName}.d.ts`);
            await promises.writeFile(`./${this._generateTypingsRequest.outputDirectory}/${camelizedEntityName}.d.ts`, typing);
        })
    }

    private async getEntityTyping(entityLogicalName: string) {

        const attributes = await this.getEntityAttributes(entityLogicalName);

        const pascalizedEntityName = pascalize(entityLogicalName);
        const interfaceAttributes = dom.create.interface(`${pascalizedEntityName}Attributes`);
        const nsXrm = dom.create.namespace(typingNamespace);
        const nsEnum = dom.create.namespace(`${pascalizedEntityName}Enum`);

        const refPath = [dom.create.tripleSlashReferencePathDirective("../node_modules/@types/xrm/index.d.ts")];
        const emitOptions: dom.EmitOptions = {
            tripleSlashDirectives: refPath,

        };

        const typeEntity = dom.create.alias(pascalizedEntityName, dom.create.namedTypeReference(`${typingOmitAttribute} & ${typingOmitControl} & ${interfaceAttributes.name}`), dom.DeclarationFlags.None);
        const interfaceEventContext = dom.create.interface(typingInterface);
        interfaceEventContext.members.push(dom.create.method(typingMethod, [], typeEntity));
        nsXrm.members.push(typeEntity);
        nsXrm.members.push(interfaceEventContext);

        attributes
            .sort(this.sortAttributes)
            .filter((a) => a.AttributeType !== "Virtual" && a.IsCustomizable.Value && !a.LogicalName.endsWith("_base"))
            .forEach((a) => {
                
                if (a.AttributeType === "Picklist")
                {
                    // Add an interface attribute with the specialised setValue and getValue methods 
                    const choiceInterface = this.createOptionSetInterface(a, entityLogicalName);
                    
                    const addInterface = dom.create.interface(choiceInterface.name);
                    addInterface.members = choiceInterface.members;
                    nsXrm.members.push(addInterface);

                    interfaceAttributes.members.push(this.createOptionSetAttributeMethod(a));
                }
                else 
                {
                    interfaceAttributes.members.push(this.createAttributeMethod(a));
                }
            });

        attributes
            .sort(this.sortAttributes)
            .filter((a) => a.AttributeType !== "Virtual" && a.IsCustomizable.Value && !a.LogicalName.endsWith("_base"))
            .forEach((a) => {
                interfaceAttributes.members.push(this.createControlMethod(a));
            });
        nsXrm.members.push(interfaceAttributes);

        const pickistColumns = attributes
            .sort(this.sortAttributes)
            .filter((a) => a.AttributeType === "Picklist" && a.IsCustomizable.Value && !a.LogicalName.endsWith("_base"));

        for (const picklistColumn of pickistColumns) {
            const attrEnum = await this.parseOptionSetsAsEnums(entityLogicalName, picklistColumn.LogicalName);
            if (attrEnum) {
                nsEnum.members.push(attrEnum);
            }
        }

        const multiSelectColumns = attributes
            .sort(this.sortAttributes)
            .filter((a) => a.AttributeTypeName.Value === "MultiSelectPicklistType"
                && a.IsCustomizable.Value && !a.LogicalName.endsWith("_base"));

        for (const column of multiSelectColumns) {
            const attrEnum = await this.parseMultiSelectOptionSetsAsEnums(entityLogicalName, column.LogicalName);
            if (attrEnum) {
                nsEnum.members.push(attrEnum);
            }
        }

        const stateCodeColumns = attributes
            .sort(this.sortAttributes)
            .filter((a) => (a.AttributeOf === "statecode" || a.AttributeOf === "statuscode") && !a.LogicalName.endsWith("_base"));

        for (const column of stateCodeColumns) {
            const attrEnum = await this.parseOptionSetsAsEnums(entityLogicalName, column.AttributeOf);
            if (attrEnum) {
                nsEnum.members.push(attrEnum);
            }
        }

        return Promise.resolve(dom.emit(nsEnum, emitOptions).concat(dom.emit(nsXrm)));
    }

    /**
 * Get the attributes for a given entity
 * @param orgUrl 
 * @param accessToken 
 * @param entityLogicalName 
 * @returns 
 */
    private async getEntityAttributes(entityLogicalName: string): Promise<IAttributeDefinition[]> {

        const respData = await this.requestData<IAttributeMetadata>(`EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`);
        if (respData) {
            return Promise.resolve(respData.value);
        } else {
            return Promise.resolve([]);
        }
    }


    private async parseOptionSetsAsEnums(entityLogicalName: string, attrLogicalName: string): Promise<dom.EnumDeclaration | undefined> {
        const optionset = await this.getOptionsetForAttribute(entityLogicalName, attrLogicalName);
        if (optionset && optionset.Options) {
            return this.createAttributeEnum(
                attrLogicalName,
                optionset.Options.map((o) => {
                    let optionName: string | undefined;
                    optionName = sanitize(pascalize(o.Label.UserLocalizedLabel.Label));

                    return <IOptionValue>{ name: optionName, value: o.Value };
                }),
            );
        }
    }

    /**
     * Get the OptionSet for an attribute.
     * @param {string} entityLogicalName - The logical name of the entity.
     * @param {string} attrLogicalName - The logical name of the attribute.
     * @returns The optionset for the attribute.
     */
    private async getOptionsetForAttribute(entityLogicalName: string, attrLogicalName: string): Promise<IOptionSet> {
        if (attrLogicalName === "statecode") {
            return await this.innerGetOptionsetForAttribute(entityLogicalName, attrLogicalName, "Microsoft.Dynamics.CRM.StateAttributeMetadata");
        } else if (attrLogicalName === "statuscode") {
            return await this.innerGetOptionsetForAttribute(entityLogicalName, attrLogicalName, "Microsoft.Dynamics.CRM.StatusAttributeMetadata");
        } else {
            return await this.innerGetOptionsetForAttribute(entityLogicalName, attrLogicalName, "Microsoft.Dynamics.CRM.PicklistAttributeMetadata");
        }
    }

    private async innerGetOptionsetForAttribute(entityLogicalName: string, attrLogicalName: string, metadataType: string): Promise<IOptionSet> {

        let url = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attrLogicalName}')/${metadataType}?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`;

        const respData = await this.requestData<IOptionSetMetadata>(url);
        if (respData) {
            return Promise.resolve(respData.OptionSet);
        } else {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            return Promise.resolve({ Options: [] });
        }
    }

    private async parseMultiSelectOptionSetsAsEnums(entityLogicalName: string, attrLogicalName: string):
        Promise<dom.EnumDeclaration | undefined> {
        const optionset = await this.getMultiSelectOptionsetForAttribute(entityLogicalName, attrLogicalName);
        if (optionset && optionset.Options) {
            return this.createAttributeEnum(
                attrLogicalName,
                optionset.Options.map((o) => {
                    let optionName: string | undefined;
                    optionName = sanitize(pascalize(o.Label.UserLocalizedLabel.Label));
                    return <IOptionValue>{ name: optionName, value: o.Value };
                }),
            );
        }
    }

    /**
     * Get the OptionSet for an multi select attribute.
     * @param {string} entityLogicalName - The logical name of the entity.
     * @param {string} attrLogicalName - The logical name of the attribute.
     * @returns The optionset for the attribute.
     */
    private async getMultiSelectOptionsetForAttribute(entityLogicalName: string, attrLogicalName: string): Promise<IOptionSet> {
        return await this.innerGetOptionsetForAttribute(entityLogicalName, attrLogicalName, "Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata");
    }


    private createAttributeMethod(attr: IAttributeDefinition): dom.MethodDeclaration {
        const logicalNameParam = dom.create.parameter("name", dom.type.stringLiteral(camelize(attr.LogicalName)));
        const returnType = dom.create.namedTypeReference(attributeTypeDefMap.get(attr.AttributeType) || xrmAttribute);

        return dom.create.method("getAttribute", [logicalNameParam], returnType);
    }

    private createOptionSetAttributeMethod(attr: IAttributeDefinition): dom.MethodDeclaration {
        const logicalNameParam = dom.create.parameter("name", dom.type.stringLiteral(camelize(attr.LogicalName)));
        const returnType = dom.create.namedTypeReference(`Omit<Attributes.OptionSetAttribute, "setValue" | "getValue"> & ${attr.LogicalName}_Options`)

        return dom.create.method("getAttribute", [logicalNameParam], returnType);
    }


    private createOptionSetInterface(attr: IAttributeDefinition, entityName: string): dom.InterfaceDeclaration {
        const enumRref = dom.create.typeParameter(`${pascalize(entityName)}Enum.${attr.LogicalName}`);
        const returnTypeParameterReference = dom.create.namedTypeReference(`${enumRref.name} | null`);
        
        // ADd the .getValue() method
        const choiceInterface = dom.create.interface(`${attr.LogicalName}_Options`);
        choiceInterface.members.push(dom.create.method("getValue", [], dom.create.namedTypeReference(returnTypeParameterReference.name)))

        // Add the .setValue() method
        const valueParameter = dom.create.parameter("value", returnTypeParameterReference);
        choiceInterface.members.push(dom.create.method("setValue", [valueParameter], dom.type.void));

        return choiceInterface;
    }

    private createControlMethod(attr: IAttributeDefinition): dom.MethodDeclaration {
        const logicalNameParam = dom.create.parameter("name", dom.type.stringLiteral(camelize(attr.LogicalName)));
        const returnType = dom.create.namedTypeReference(controlTypeDefMap.get(attr.AttributeType) || xrmControl);

        return dom.create.method("getControl", [logicalNameParam], returnType);
    }

    private createAttributeEnum(attrLogicalName: string, options: IOptionValue[]): dom.EnumDeclaration | undefined {
        const e = dom.create.enum(attrLogicalName, true, dom.DeclarationFlags.ReadOnly);
        options.forEach((o) => {
            if (o.name) {
                e.members.push(dom.create.enumValue(o.name, o.value));
            }
        });
        return e;
    }

    private sortAttributes(a1: IAttributeDefinition, a2: IAttributeDefinition) {
        if (a1.LogicalName > a2.LogicalName) {
            return 1;
        }
        if (a1.LogicalName < a2.LogicalName) {
            return -1;
        }
        return 0;
    }


    private async getEntitiesWithPublisherPrefix() {
        let url = `EntityDefinitions?$select=LogicalName`;

        type EntitySchemaName = Pick<IEntityDefinition, "LogicalName" | "MetadataId">;
        type AllEntities = {
            value: EntitySchemaName[]
        };

        const respData = await this.requestData<AllEntities>(url);
        //const respData = await this.requestData<Pick<IEntityDefinition, "SchemaName" | "MetadataId">[]>(url);

        return respData?.value.filter(e => e.LogicalName.startsWith(this._generateTypingsRequest.publisherPrefix));
    }


    async requestData<T>(query: string, retries?: number): Promise<T | undefined> {
        try {

            const requestUrl = `${this._generateTypingsRequest.orgUrl}/api/data/v9.2/${query}`;

            const response = await fetch(requestUrl, {
                headers: {
                    Authorization: `Bearer ${this._accessToken}`,
                    "Content-Type": "application/json; charset=utf-8",
                },
            });

            if (response.ok) {
                return (await response.json()) as T;
            } else {
                throw new Error(response.statusText);
            }
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

}
















