# changes

- Added comment support to the parser, reorganised the comments
- Alter the parser so literals can also be used in "INTERPRET_AS" constructs
- Add function for structOffset, to be able to retrieve an offset value from a struct

- Added structures for frog, car, and input
- Rewrite some of the code to use the structures

## Adding bounds checking

- acu contains x pos
- check if the x pos is negative
  - if so, the car must have driven off the left side of the screen
  - set x to 240 (address of x is in r5)
- check if x pos > 240
  - if so, the car must have driven off the right side of the screen
  - set x to 0

## Adding collision detection

- Create a data structure that will hold x, y, x2, y2 for bounds checks
  - Add structure
  - Add two locations in memory to hold the frog and "other"
- Start writing a "collision" routuine
  - Not making use of calling convention, instead pass args through registers
- Populate the data structures
- Check corner by corner
  - Write the equivilent if-statement
  - The condition checks are "the other way around", and so whenever there is a `a > b` check, it ends up as a `!(b >= a)`
- If it makes it to the end of the check, throw a `1` in the acu and return
- If it jumps to the end of the collision routine at any point, throw a `0` in the acu and return

## Using the collision

- Above the bounds check
- Store r1 and the acu since they contain some state
- load the car offset
- divide by 16 with a rsf 4
- add negative one (since the increase happens at the beginning of the cars routine)
- that goes in r1, since it's the "argument"
- Push 0 for no args (in the VMs official calling convention)
- call the collision routine
- If acu now contains a 1, move the frog somewhere else
- Restore state