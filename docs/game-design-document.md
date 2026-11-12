# Midnight Snackdown: Game Design Document

This document describes the game as built. Ideas that are not built yet are listed in [section 10](#10-backlog).

## 1. Summary

Two rival raccoons raid a sleeping house at night. Each tries to find a picnic basket, pack it with a four-dish feast and escape through the garden gate. They slow each other down with hidden traps and paw swats.

The screen is split into two side-by-side panes, one for each raccoon. Both are always visible, so watching your rival's pane tells you where they have been and where they set traps.

## 2. Characters

| Raccoon | Colours | Starts in | Controlled by |
| :--- | :--- | :--- | :--- |
| **Rusty** | Rust fur, red bandana | Garage | Player (keyboard) |
| **Soot** | Slate fur, teal bandana | Cellar | Computer |

## 3. The house

Eight rooms form a ring around a courtyard, so there are always two routes between rooms and every door is a choke point. The raccoons start in opposite corners, each two rooms from the Back Porch.

```text
[Garage]  <-> [Hall]   <-> [Back Porch] --> garden gate
   ^                            ^
   v                            v
[Laundry]    (courtyard)     [Pantry]
   ^                            ^
   v                            v
[Lounge]  <-> [Dining] <-> [Cellar]
```

Each room is a logical 320x200 space with a walkable floor area of x 20 to 300, y 50 to 190, and has four pieces of searchable furniture: two against the back wall and two on the floor. The types are fridge, cupboard, table, bin and hamper.

Furniture has no collision; raccoons walk in front of it.

## 4. Loot and carrying

Five pieces of loot are hidden each match: the **picnic basket** plus the four dishes, **pizza**, **cheese**, **honey** and **fish**.

- Placement is random each match: one piece per room, never in a starting room.
- Without the basket a raccoon carries one piece in their mouth. Taking another drops the first at their feet.
- Finding the basket packs whatever they are carrying into it, and from then on everything goes in the basket.

## 5. Traps and tools

Each raccoon starts with two of each trap, and always has all five tools, holding one at a time.

| Trap | Set on | Cleared with |
| :--- | :--- | :--- |
| Snap Trap | Furniture | Oven Mitt |
| Glue Pad | Furniture | Cooking Oil |
| Pepper Poof | Furniture | Clothes Peg |
| Marble Spill | Doors | Broom |
| Static Mat | Doors | Rubber Boots |

- A trap must be set within reach of its target (30 units), and each target holds one trap.
- Furniture traps fire when the search finishes. Door traps fire on walking through or leaving by the gate.
- A door trap covers both sides of the doorway.
- Holding the matching tool clears the trap and the action carries on as normal. Otherwise the trap springs and knocks out whoever set it off, including its planter.
- Either way the trap is used up.
- Traps are hidden: a pane only shows traps planted by that pane's raccoon.

## 6. Combat

- Swat range is 32 units. Swatting turns the raccoon to face a rival in the same room.
- Each swat does 25 damage out of 100 health, so four swats knock out. Swats have a 20-tick cooldown.
- A hit stuns for 15 ticks and interrupts any search in progress.
- Health does not regenerate until the raccoon wakes from a knockout.

## 7. Knockouts, clocks and ending the match

- **Knockout:** 5 seconds out of action. All loot scatters on the floor where they fell, 15 seconds come off that raccoon's own clock, and they wake at full health in their starting room.
- **Clocks:** each raccoon has their own 180-second clock (configurable in Options: 120s, 180s, or 300s).
- **Clock reaches zero:** that raccoon falls asleep for the rest of the match. Their loot scatters on the floor, their traps stay armed, and the rival plays on alone.
- **Win:** leave through the garden gate with the full feast, by walking through it or pressing the action key beside it.
- **Refused:** without a full feast the gate stays shut and shows a message. There is no penalty.
- **Draw:** both raccoons fall asleep. The sun comes up and nobody eats.

## 8. Computer opponent

Soot works through these priorities every tick:

1. Swat a rival within reach.
2. If the feast is packed, go to the gate.
3. Chase a rival in the same room who is carrying loot.
4. Pick up floor loot in this room, unless it would only swap with what it is carrying.
5. Search unsearched furniture in this room.
6. Go to the nearest room with something left to do.
7. Hunt a rival carrying loot, otherwise roam.

Routes are found by breadth-first search over the door graph. At most every 8 seconds, Soot sets a trap on the door or furniture it is next to. It knows its own traps and holds the right tool for them, but has to guess for its rival's. It leaves furniture it has trapped until there is nothing else to search.

Soot sees what a player can see on screen, including what has been searched and what is on the floor in any room. It does not know where unfound loot is or where its rival's traps are.

## 9. Tuning values

| Value | Setting |
| :--- | :--- |
| Simulation rate | 60 ticks per second |
| Walk speed | 2.5 units per tick |
| Search time | 60 ticks |
| Clock per raccoon | 180 seconds default (configurable: 120s, 180s, 300s) |
| Knockout duration | 300 ticks |
| Knockout clock penalty | 15 seconds |
| Swat damage and range | 25 damage, 32 units |
| Swat cooldown | 20 ticks |
| Hit stun | 15 ticks |
| Door trigger reach | 16 units |
| Door cooldown | 30 ticks |
| Search and pick-up reach | 25 units |
| Trap-setting reach | 30 units |
| Starting traps | 2 of each |

## 9b. 3D Presentation, Instructions & Options

- **3D Cutaway Diorama Renderer**: Rooms render in 3D perspective with cutaway wall caps, perspective-converging floor tiles/planks/flagstones, volumetric window moonbeams, 3D extruded furniture with open/searched states, and 3D spherical/cylindrical shaded raccoons.
- **Instructions & Options Menu**: Accessible from the top-right toolbar or via keyboard shortcuts (`I`/`H` for Instructions, `O`/`Esc` for Options). Opening the menu pauses the simulation and raid clocks.
  - **Instructions Tab**: Full control guide, house ring diagram, and trap-to-counter-tool table.
  - **Options Tab**: Sound effects toggle and master volume slider, 3D graphics toggles (Volumetric Moonlight Rays, 3D Shadows & Reflections, 3D Perspective Extrusion Depth), Controls Hint bar visibility, Raid Clock duration selector (`2:00`, `3:00`, `5:00`), and a **Start New Raid** button.

## 10. Backlog

Not built yet:

- Second human player on the keyboard or a gamepad.
- Scoring and end-of-match ranks.
- Difficulty levels for Soot, and larger houses.
- A house map on screen.
- Spare tools found around the house, rather than always being carried.
