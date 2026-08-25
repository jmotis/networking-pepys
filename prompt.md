Initial prompts used for Claude Code network generation:

Network Four (Claude Code), stopped after 1660:
Create a transportation network of all the places Pepys goes in diary_1660.txt 
Nodes are places. Edges are formed when Pepys travels from one place to another. Network travel should be continuous - Pepys should never depart a node he has not just arrived at. He should start and end each day at home or at whatever location he spends the night. 
Add the date, mode of transportation, and any travel companions as attribute data to the edges. 
You should use contextual information to infer the location of places like "home" or "office" which may refer to multiple places throughout the whole diary.

Network Three (Claude Code):
I want to conduct network analysis on the diary of samuel pepys, in diary.txt
The eventual goal is to create a node list and an edge list for a network of places Pepys visits in the text, with nodes being places and directed edges indicating that Pepys traveled from one place (node) to another place (node)
Begin by extracting all locations / place names in the diary to create the node list
The node list should contain, for each location/place, 1) "id" a unique identifier 2) "name" descriptive text naming the place, e.g. "home" or "office" or "Sun Tavern" 3) "location" any additional descriptive text providing information about the place, such as a city, street, parish, or area of a city
Pepys moved partway through the diary and thus has two different locations he called home; these should be treated as a different location, despite the same name being used in the diary text. follow this same principle when he moves offices, or when he goes to the houses of people who have moved, especially in the wake of the September 1666 fire which burns down much of London
In general, places should be identified at the level of granularity of the building - e.g. Pepys' bedchamber or kitchen are all still Pepys' home - however the massive palace complexes such as Whitehall can be subdivided into chambers and places without granular location data (e.g. Pepys went to Islington) can be identified at the street or town level. individual ships are places and can be treated as such (when Pepys is on a ship, he is on that ship regardless of where it is located, until he disembarks to another ship or land-based location).
When adding a new place to the node list, always check the full list for possible variant spellings/references and use LLM contextual clues to confirm it is a new place before adding
If you have any questions as you implement this task, stop and query me before continuing.

Network Two (Claude Chat, Opus 4.6):
I want to conduct network analysis on the diary of samuel pepys. a version of this document can be found at https://www.gutenberg.org/cache/epub/4200/pg4200.txt or the diary.txt project file
create a node list and an edge list for a network of places Pepys visits in the text, with nodes being places and directed edges indicating that Pepys traveled from one place (node) to another place (node)
the node list should contain 1) "id" a unique identifier for every place that Pepys vists in the text 2) "name" descriptive text naming the place, e.g. "home" or "office" or "Sun Tavern" 3) "location" any additional descriptive text providing information about the place, such as a city, street, parish, or area of a city
the edge list should contain 1) "source" the unique identifier of the place where Pepys starts and 2) "target" the unique identifier of the place where Pepys travels to next 3) "year" the year of the diary entry 4) "month" the month of the diary entry 5) "day" the day of the diary entry 6) "mode" the mode of transportation (usually he will "walk", particularly when he does not mention a mode of transportation, but he may sometimes be transported by "boat" "horse" "coach" etc.) 7) "companion" a list of any people he is traveling with
if "home" refers to something other than his residence in Axe Yard, this should be treated as a different location, despite the same name being used in the diary text
infer a direct edge from each  mentioned location to the next mentioned location, even when the transition isn't explicitly described, as long as the text indicates that the transition between locations occurred during that diary day without an intervening location. 
waypoints should always count as separate locations if mentioned in the text
Pepys often travels from home to office or office to home. these are separate locations and should be treated as such, with edges between them. when he goes to bed, this is a chamber within a location (e.g. within his home) and should not be treated as a separate location.
use the standardized name of his companions (e.g. Elizabeth Pepys) rather than the literal text (my wife)
chunk the task appropriately
output results as two csv files, e.g.: pepys-nodes.csv and pepys-edges.csv
if you have any questions as you implement this task, stop and query me before continuing.

Network One (Claude Chat, Sonnet 4.6):
I want to conduct network analysis on the diary of samuel pepys. a version of this document can be found at __https://www.gutenberg.org/cache/epub/4200/pg4200.txt__
create a node list and an edge list for a network of places Pepys visits in the text, with nodes being places and directed edges indicating that Pepys traveled from one place (node) to another place (node)
the node list should contain 1) "id" a unique identifier for every place that Pepys vists in the text 2) "name" descriptive text naming the place, e.g. "home" or "office" or "Sun Tavern" 3) "location" any additional descriptive text providing information about the place, such as a city, street, parish, or area of a city
the edge list should contain 1) "source" the unique identifier of the place where Pepys starts and 2) "target" the unique identifier of the place where Pepys travels to next 3) "year" the year of the diary entry 4) "month" the month of the diary entry 5) "day" the day of the diary entry 6) "mode" the mode of transportation (usually he will "walk", particularly when he does not mention a mode of transportation, but he may sometimes be transported by "boat" "horse" "coach" etc.) 7) "companion" a list of any people he is traveling with
if "home" refers to something other than his residence in Axe Yard, this should be treated as a different location, despite the same name.
infer direct edges from each mentioned location
use the full name of his travel companions (e.g. Elizabeth Pepys) rather than the literal text (my wife)
read the first 10 diary entries, starting with the entry for January 1, 1660, then create node and edge lists for the places in those 10 entries, and then output both the full text of the 10 entries and the node/edge list created for those entries as a quality control measure. 
if you have any questions as you begin this task, stop and query me before continuing.
