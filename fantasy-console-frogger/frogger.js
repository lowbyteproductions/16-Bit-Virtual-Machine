const hex = n => n.toString(16).padStart(4, '0');
const addr = n => `&${hex(n)}`;
const lit = n => `$${hex(n)}`;
const negative = n => lit((~n & 0xffff) + 1);

const comment = str => '';

module.exports = ({
  frog,
  input,
  cars
}) => `
start:

check_up_pressed:
  mov8 ${addr(input)}, acu
  jeq ${lit(0)}, &[!check_down_pressed]
  mov ${addr(frog + 2)}, r1
  add ${negative(4)}, r1
  mov acu, ${addr(frog + 2)}

check_down_pressed:
  mov8 ${addr(input + 1)}, acu
  jeq ${lit(0)}, &[!check_left_pressed]
  mov ${addr(frog + 2)}, r1
  add ${lit(4)}, r1
  mov acu, ${addr(frog + 2)}

check_left_pressed:
  mov8 ${addr(input + 2)}, acu
  jeq ${lit(0)}, &[!check_right_pressed]
  mov ${addr(frog)}, r1
  add ${negative(4)}, r1
  mov acu, ${addr(frog)}

check_right_pressed:
  mov8 ${addr(input + 3)}, acu
  jeq ${lit(0)}, &[!check_input_end]
  mov ${addr(frog)}, r1
  add ${lit(4)}, r1
  mov acu, ${addr(frog)}

check_input_end:

update_cars:

  ${comment('load cars offset into the acu')}
  mov8 &[!carsOffset], acu
  jeq ${lit(0x20)}, &[!end_of_update_cars]

  ${comment('write the next car offset into memory')}
  mov acu, r5
  add ${lit(0x10)}, acu
  movl acu, &[!carsOffset]
  mov r5, acu

  ${comment('place address of the current car into the acu')}
  add ${lit(cars)}, acu
  ${comment('place car address into r5')}
  mov acu, r5
  ${comment('load the xpos into r1')}
  mov &acu, r1
  ${comment('calculate the address of the speed property of the car and place in the acu')}
  add ${lit(9)}, r5
  ${comment('put the value of the speed property in the acu')}
  mov &acu, acu
  ${comment('calculate the new speed, place in acu')}
  add acu, r1
  ${comment('move the new x value to the cars x property')}
  mov acu, &r5

  ${comment('jump to the top of the car update loop')}
  mov [!update_cars], ip


end_of_update_cars:
  mov ${lit(0)}, &[!carsOffset]

end_of_game_logic:
  mov8 ${lit(1)}, &[!hasEnded]
end_of_game_logic_loop:
  mov [!end_of_game_logic_loop], ip

after_frame:
  psh acu
  mov8 &[!hasEnded], acu
  jeq ${lit(0)}, &[!after_frame_2]
  mov8 ${lit(0)}, &[!hasEnded]
  pop acu
  pop r8
  psh [!start]
  rti

after_frame_2:
  pop acu
  rti

data8 hasEnded = { ${lit(0)} }
data8 carsOffset = { ${lit(0)} }
`.trim();
