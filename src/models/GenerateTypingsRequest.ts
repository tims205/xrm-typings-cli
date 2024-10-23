export type GenerateTypingsRequest = {

    orgUrl: string;

    entityNames: string[];
    publisherPrefix: string;


    outputDirectory: string;

    /**
     * App Id to use when generating a token
     * Defaults to 51f81489-12ee-4a9e-aaae-a2591f45987d the generic Dataverse app registration
     */
    appId: string;

    /**
     * Localhost port to used when listening for auth redirect 
     * Defaults to 8080
     */
    port: number;



}
