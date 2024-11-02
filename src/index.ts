#!/usr/bin/env node

import { Command } from "commander";
import { TypingsGenerator } from "./generate/index.js";
import { GenerateTypingsRequest } from "./models/GenerateTypingsRequest.js";
import { XrmTypingsCLIRequest } from "./models/XrmTypingsCLIRequest.js";
import { ConstantRecordsGenerator } from "./makeconstants/index.js";

const program = new Command();

const parsePortNumberInput = (input: string) => {
  if (isNaN(parseInt(input.trim()))) {
    throw new Error(`The value '${input}' is not a valid port number`);
  }
  return parseInt(input.trim());
};

program
  .command("constants")
  .requiredOption("-e, --entityNames <string>", "Entity names")
  .requiredOption("-o, --org <string>", "Org url")
  .requiredOption(
    "-n, --namespace <string>",
    "Top level namespace for d.ts file"
  )
  .option(
    "-p --publisherPrefix <string>",
    "Generate typings for all entities with this Publisher Prefix"
  )
  .option("-d --outputDirectory <string>", "Output directory", "constants")
  .option("-s, --separator <char>", "separator character", ",")
  .option(
    "-a, --appId <string>",
    "App Registration Id to use when generating auth token",
    "51f81489-12ee-4a9e-aaae-a2591f45987d"
  )
  .option(
    "-l, --listenerPort <int>",
    "Port to listen for auth callback",
    parsePortNumberInput,
    8080
  )

  .action(async (options) => {
    const entities = options.entityNames.trim().split(options.separator);

    const request: XrmTypingsCLIRequest = {
      entityNames: entities,
      orgUrl: options.org?.trim(),
      outputDirectory: options.outputDirectory?.trim(),
      appId: options.appId?.trim(),
      port: options.listenerPort,
      namespace: options.namespace.trim(),
    };

    const gen = new ConstantRecordsGenerator(request);

    await gen.Connect();

    await gen.GenerateRecordConstants();
  })
  .description(
    "Generate constants for Dataverse records used as configuration or reference data."
  );

program
  .command("generate")

  .requiredOption("-e, --entityNames <string>", "Entity names")
  .requiredOption("-o, --org <string>", "Org url")

  .option(
    "-p --publisherPrefix <string>",
    "Generate constants for all entities with this Publisher Prefix"
  )
  .option("-d --outputDirectory <string>", "Output directory", "typings")
  .option("-s, --separator <char>", "separator character", ",")

  .option(
    "-a, --appId <string>",
    "App Registration Id to use when generating auth token",
    "51f81489-12ee-4a9e-aaae-a2591f45987d"
  )
  .option(
    "-l, --listenerPort <int>",
    "Port to listen for auth callback",
    parsePortNumberInput,
    8080
  )

  .action(async (options) => {
    const entities = options.entityNames.trim().split(options.separator);
    const typingsRequest: GenerateTypingsRequest = {
      entityNames: entities,
      publisherPrefix: options.publisherPrefix?.trim(),
      orgUrl: options.org?.trim(),
      outputDirectory: options.outputDirectory?.trim(),
      appId: options.appId?.trim(),
      port: options.listenerPort,
    };

    const gen = new TypingsGenerator(typingsRequest);

    await gen.Connect();

    await gen.GenerateTypings();

    console.log("Complete");
  })
  .description("Generate .d.ts typings for one or more Dataverse tables.");

program.parse(process.argv);
