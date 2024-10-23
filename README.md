# xrmtypings
A command line tool for generating typings for Dataverse entities.

Source code has been used and adapted from the brilliant Dataverse DevTools Visual Studio Code Extension:

https://github.com/Power-Maverick/DataverseDevTools-VSCode

# Example Usage

Generate typings for the account and contact, and all other entities with a publisher prefix of 'tim' in a particular environment:

`xrmtypings generate -o https://ENV.crm.dynamics.com/ -e account,contact -d typings -p tim`

See all command line flags

`xrmtypings generate --help`
