# Off camera

- added missing format regLit
  - used in shift instructions
  - used in sub r1, $34
- fixed shifts

# On camera

- turn instructions.js into a directory
  - make a meta mapping for instructions
    - only show 1 example - no need to go crazy here
  - index.js becomes a file where the metadata array is indexed by instruction name and opcode
- change CPU.js to use `instructions.XXX_XXX.opcode`
- change assembler/parser index to use `A.many(instructionParser)` as it's primary export
- create an index.js in assembler
  - register map
  - example program
  - parsed output
  - machine code array
  - encode functions for litOrMem, lit8, and reg
- test it out in max's debugger

- labels
  - write an example program using labels
  - add a label parser and type
  - change the assembler to choose between instructions or labels
  - create a labels object
  - current address variable, starting at 0
  - loop through the instructions and assign labels
  - in the encode functions, change, hexVal so that if it's a variable it comes from the label table
  - in the second instruction loop, early return if it's a label

- generate the code and step through in the IDE

- You could generate the parsers based on the instruction metadata. This is a good idea because it creates a single source of truth - reducing the possiblity of bugs that occur when you change something in one place but not another

