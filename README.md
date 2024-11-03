# xrmtypings

A command line tool for generating typings for Dataverse entities.

Source code has been used and adapted from the brilliant Dataverse DevTools Visual Studio Code Extension:

https://github.com/Power-Maverick/DataverseDevTools-VSCode

# Installation

In a command prompt run:

`npm install -g @timsturgeon/xrmtypings`

# Example Usage

## Generate Typings

Generate typings for the account and contact, and all other entities with a publisher prefix of 'tim' in a particular environment:

`xrmtypings generate -o https://ENV.crm.dynamics.com/ -e account,contact -d typings -p tim`

### Using Typings

Inside your Dataverse TypeScript project run:

`npm install @types/xrm`

When getting form context cast it to a particular type to access typings and use intellisense in your IDE.

```typescript
export async function onLoad(
  context: Xrm.Events.LoadEventContext
): Promise<void> {
  // Cast the form context to the type you are working with
  const formContext: Xrm.Account = context.getFormContext();

  // Typings are then provided when working with form attributes and controls
  const categoryCode = formContext
    .getAttribute("accountcategorycode")
    .getValue();
}
```

## Generate Constants

Generate an enum of record names and identifiers where your solution uses Dataverse tables to hold reference or configuration data.

The example below will generate d.ts files that add all instances of the 'pub_customerregion' entity to an enum inside the 'Tim' namespace

`xrmtypings constants", "-e pub_customerregion", "-o https://ORG.crm.dynamics.com/", "-n Tim"`

### Using Constants

When getting values from Lookup attributes the .id value can then be compared to the appropriate enum.

```typescript
const customerRegion = formContext
  .getAttribute("pub_customerregionid")
  .getValue()?.[0];

if (customerRegion?.id === Tim.pub_customerregion_Constants.North) {
  ///
}
```

See all command line flags

`xrmtypings generate --help`
