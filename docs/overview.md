# Overview

The DirtLeague bot is designed to keep track of private league tag distribution as well as other minor things (leaderboards, announcements, etc).

## Tech

Language is `Typescript` run in `NodeJS` through `ts-node`. Might look into using `deno` in the future.
`npm workspaces` are used to seperate modules into logical containers. Nothing should need to be published as NPM packages so we just reference the typescript directly (no compilation to JS).