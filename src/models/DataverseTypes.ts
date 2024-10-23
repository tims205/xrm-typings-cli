export interface IEntityMetadata {
    value: IEntityDefinition[];
}

export interface IEntityDefinition {
    ActivityTypeMask: number;
    IsDocumentManagementEnabled: boolean;
    IsOneNoteIntegrationEnabled: boolean;
    IsInteractionCentricEnabled: boolean;
    IsKnowledgeManagementEnabled: boolean;
    IsSLAEnabled: boolean;
    IsBPFEntity: boolean;
    IsActivity: boolean;
    IsActivityParty: boolean;
    IsAvailableOffline: boolean;
    IsAIRUpdated: boolean;
    IconLargeName: null;
    IconMediumName: null;
    IconSmallName: null;
    IconVectorName: null;
    IsCustomEntity: boolean;
    IsBusinessProcessEnabled: boolean;
    ChangeTrackingEnabled: boolean;
    IsManaged: boolean;
    IsEnabledForCharts: boolean;
    IsEnabledForTrace: boolean;
    IsValidForAdvancedFind: boolean;
    MobileOfflineFilters: string;
    IsReadingPaneEnabled: boolean;
    IsQuickCreateEnabled: boolean;
    LogicalName: string;
    ObjectTypeCode: number;
    OwnershipType: string;
    PrimaryNameAttribute: string;
    PrimaryImageAttribute: string;
    PrimaryIdAttribute: string;
    SchemaName: string;
    EntityColor: string;
    EntitySetName: string;
    HasNotes: boolean;
    HasActivities: boolean;
    HasEmailAddresses: boolean;
    MetadataId: string;
    Description: IDescription;
    DisplayCollectionName: IDescription;
    DisplayName: IDescription;
    IsAuditEnabled: IIs;
    IsValidForQueue: IIs;
    IsConnectionsEnabled: IIs;
    IsCustomizable: IIs;
    IsRenameable: IIs;
    IsMappable: IIs;
    IsDuplicateDetectionEnabled: IIs;
    IsMailMergeEnabled: IIs;
    IsVisibleInMobile: IIs;
    IsVisibleInMobileClient: IIs;
    IsReadOnlyInMobileClient: IIs;
    IsOfflineInMobileClient: IIs;
    TableType: string;
    Attributes: IAttributeMetadata;
}

export interface IAttributeMetadata {
    value: IAttributeDefinition[];
}

export interface IAttributeTypeName {
    Value: string;
}

export interface IAttributeDefinition {
    AttributeType: string;
    AttributeTypeName: IAttributeTypeName;
    AttributeOf: string;
    MaxLength: number;
    IsPrimaryId: boolean;
    IsSearchable: boolean;
    IsManaged: boolean;
    LogicalName: string;
    SchemaName: string;
    AutoNumberFormat: string;
    MetadataId: string;
    IsAuditEnabled: IIs;
    IsGlobalFilterEnabled: IIs;
    IsSortableEnabled: IIs;
    IsCustomizable: IIs;
    IsRenameable: IIs;
    IsValidForAdvancedFind: IIs;
    RequiredLevel: IRequiredLevel;
}

export interface IRequiredLevel {
    Value: string;
    CanBeChanged: boolean;
    ManagedPropertyLogicalName: string;
}

export interface IDescription {
    UserLocalizedLabel: IUserLocalizedLabel;
}

export interface IUserLocalizedLabel {
    Label: string;
    LanguageCode: number;
    IsManaged: boolean;
    MetadataId: string;
    HasChanged: null;
}

export interface IIs {
    Value: boolean;
    CanBeChanged: boolean;
    ManagedPropertyLogicalName: string;
}

export interface IOptionSetMetadata {
    LogicalName: string;
    MetadataId: string;
    OptionSet: IOptionSet;
    GlobalOptionSet: IOptionSet;
}

export interface IOptionSet {
    MetadataId?: string;
    Options: IOption[];
}

export interface IOption {
    Value: number;
    IsManaged: boolean;
    MetadataId: null;
    Label: IDescription;
    Description: IDescription;
}

export interface IOptionValue {
    name: string;
    value: number;
}