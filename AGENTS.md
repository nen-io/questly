
# Purpose
Questly is an app that allows, friends, couples & family's to gamify life. Letting players create custom quests and rewards. Friendly competition helping them push each other.

# Overall
- Avoid code duplication and focus on trying to reuse code
- Ensure high quality production ready code
- Do not leave something half baked or for later
- Consider impact of changes on the wider project
- Be strict in sticking to project standards
- Add a lot of code comments to explain business logic clearly and consisely
- Remove any redudant or dead code, same with files and folders

## API
- Make each router is a folder that contains one file for each route handler making it easier to find the route I want to work on and isolating changes.
- Ensure strong typing between the UI and API
- Use zod where possible to validate any input params

## UI 
- avoid large complex files
- breakdown components to small atomic and reusable files with a strict heiracy
  - if a component is used throughout an app then it should be stored in the components
  - if its used in a specific page is should be in a folder for that page under the pages folder
- Avoid local state
- each route should be its own page folder / component. These can be nested within other page routes if it is a sub route
- Always clean up any old legacy code
- strong typing between the UI and API
