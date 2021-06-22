const hex = n => n.toString(16).padStart(4, '0');
const addr = n => `&${hex(n)}`;
const lit = n => `$${hex(n)}`;
const negative = n => lit((~n & 0xffff) + 1);
const structOffset = (struct, property) => `[<${struct}> ${addr(0)}.${property}]`;

module.exports = ({ cars }) => `

structure Sprite {
  x: $02, y: $02,
  tileIndex: $01, animationOffset: $01
}

structure Frog {
  x: $02, y: $02,
  tileIndex: $01
}

structure Car {
  x: $02, y: $02,
  tileIndex: $01, animationOffset: $01,
  ignore0: $03,
  velocity: $02
}

structure Input {
  Up: $01, Down: $01,
  Left: $01, Right: $01,
  A: $01, B: $01,
  Start: $01, Select: $01
}

structure Box {
  x: $02, y: $02,
  x2: $02, y2: $02
}

constant InputAddr = $2620
constant FrogAddr = $2020
constant SpriteMemory = $2020
constant FrogBox = $5000
constant OtherBox = $5008

start:

check_up_pressed:
  mov8 &[<Input> InputAddr.Up], acu
  jeq ${lit(0)}, &[!check_down_pressed]
  mov &[<Frog> FrogAddr.y], r1
  add ${negative(4)}, r1
  mov acu, &[<Frog> FrogAddr.y]

check_down_pressed:
  mov8 &[<Input> InputAddr.Down], acu
  jeq ${lit(0)}, &[!check_left_pressed]
  mov &[<Frog> FrogAddr.y], r1
  add ${lit(4)}, r1
  mov acu, &[<Frog> FrogAddr.y]

check_left_pressed:
  mov8 &[<Input> InputAddr.Left], acu
  jeq ${lit(0)}, &[!check_right_pressed]
  mov &[<Frog> FrogAddr.x], r1
  add ${negative(4)}, r1
  mov acu, &[<Frog> FrogAddr.x]

check_right_pressed:
  mov8 &[<Input> InputAddr.Right], acu
  jeq ${lit(0)}, &[!check_input_end]
  mov &[<Frog> FrogAddr.x], r1
  add ${lit(4)}, r1
  mov acu, &[<Frog> FrogAddr.x]

check_input_end:

update_cars:

  mov8 &[!carsOffset], acu                  ;; load cars offset into the acu
  jeq ${lit(0x20)}, &[!end_of_update_cars]  ;; jump if we've processed all the cars

  ;; write the next car offset into memory
  mov acu, r5
  add ${lit(0x10)}, acu
  movl acu, &[!carsOffset]
  mov r5, acu

  add ${lit(cars)}, acu ;; place address of the current car into the acu
  mov acu, r5           ;; place car address into r5
  mov &acu, r1          ;; load the xpos into r1

  ;; calculate the address of the speed property of the car and place in the acu
  add ${structOffset('Car', 'velocity')}, r5

  mov &acu, acu         ;; put the value of the speed property in the acu
  add acu, r1           ;; calculate the new x position, place in acu
  mov acu, &r5          ;; move the new x value to the cars x property

  ;; Negative bounds detection
  mov acu, r6
  and acu, $8000
  jeq $0000, &[!positive_bounds_check]
  mov ${lit(240)}, &r5
  mov [!end_of_bounds_check], ip

positive_bounds_check:
  mov r6, acu
  jgt ${lit(240)}, &[!end_of_bounds_check]
  mov ${lit(0)}, &r5

end_of_bounds_check:

start_of_car_collision_check:

  mov8 &[!carsOffset], acu
  add ${negative(16)}, acu
  rsf acu, $04
  add ${lit(1)}, acu
  mov acu, r1
  psh $00
  cal [!collision]
  jeq $00, &[!end_of_car_collision_check]
  mov $08, &[<Frog> FrogAddr.x]
  mov $08, &[<Frog> FrogAddr.y]

end_of_car_collision_check:

  mov [!update_cars], ip  ;; Jump back to the top of the loop

end_of_update_cars:
  mov ${lit(0)}, &[!carsOffset]

end_of_game_logic:
  mov8 ${lit(1)}, &[!hasEnded]
end_of_game_logic_loop:
  mov [!end_of_game_logic_loop], ip



;; bool collision(uint16 spriteIndex) { ... }
collision:
;; Build up the frog box struct
  ;; x position
  mov &[<Frog> FrogAddr.x], acu
  mov acu, &[<Box> FrogBox.x]

  ;;y position
  mov &[<Frog> FrogAddr.y], acu
  mov acu, &[<Box> FrogBox.y]

  ;; x2 position
  mov &[<Frog> FrogAddr.x], acu
  add $08, acu
  mov acu, &[<Box> FrogBox.x2]

  ;; y2 position
  mov &[<Frog> FrogAddr.y], acu
  add $08, acu
  mov acu, &[<Box> FrogBox.y2]

;; Build up the other sprite box struct
  lsf r1, $04
  add [!SpriteMemory], r1
  mov acu, r1              ;; r1 contains the base address of the sprite now

  ;; x
  mov ${structOffset('Sprite', 'x')}, r2    ;; Move the offset to r2
  add r2, acu                               ;; add the offset to the base address
  mov &acu, acu                             ;; Get the actual value in the acu
  mov acu, &[<Box> OtherBox.x]

  ;; y
  mov ${structOffset('Sprite', 'y')}, r2    ;; Move the offset to r2
  add r2, r1                                ;; add the offset to the base address
  mov &acu, acu                             ;; Get the actual value in the acu
  mov acu, &[<Box> OtherBox.y]

  ;; x2
  mov ${structOffset('Sprite', 'x')}, r2    ;; Move the offset to r2
  add r2, r1                                ;; add the offset to the base address
  mov &acu, acu                             ;; Get the actual value in the acu
  add $08, acu                              ;; Add 8 pixel offset
  mov acu, &[<Box> OtherBox.x2]

  ;; y2
  mov ${structOffset('Sprite', 'y')}, r2    ;; Move the offset to r2
  add r2, r1                                ;; add the offset to the base address
  mov &acu, acu                             ;; Get the actual value in the acu
  add $08, acu                              ;; Add 8 pixel offset
  mov acu, &[<Box> OtherBox.y2]


;; Test corner 0
  ;; if (ax >= bx && ax < bx2 && ay >= by && ay < by2)

  ;; ax >= bx
  mov &[<Box> FrogBox.x], r1
  mov &[<Box> OtherBox.x], acu
  jlt r1, &[!corner1]

  ;; ax < bx2
  mov &[<Box> FrogBox.x], r1
  mov &[<Box> OtherBox.x2], acu
  jge r1, &[!corner1]

  ;; ay >= by
  mov &[<Box> FrogBox.y], r1
  mov &[<Box> OtherBox.y], acu
  jlt r1, &[!corner1]

  ;; ay < by2
  mov &[<Box> FrogBox.y], r1
  mov &[<Box> OtherBox.y2], acu
  jge r1, &[!corner1]

  ;; Collision!
  mov $01, acu
  ret

corner1:
;; Test corner 1
  ;; if (ax > bx && ax <= bx2 && ay >= by && ay < by2)

  ;; ax >= bx
  mov &[<Box> FrogBox.x2], r1
  mov &[<Box> OtherBox.x], acu
  jle r1, &[!corner2]

  ;; ax < bx2
  mov &[<Box> FrogBox.x2], r1
  mov &[<Box> OtherBox.x2], acu
  jgt r1, &[!corner2]

  ;; ay >= by
  mov &[<Box> FrogBox.y], r1
  mov &[<Box> OtherBox.y], acu
  jlt r1, &[!corner2]

  ;; ay < by2
  mov &[<Box> FrogBox.y], r1
  mov &[<Box> OtherBox.y2], acu
  jge r1, &[!corner2]

  ;; Collision!
  mov $01, acu
  ret

corner2:
;; Test corner 2
  ;; if (ax > bx && ax <= bx2 && ay > by && ay <= by2)

  ;; ax >= bx
  mov &[<Box> FrogBox.x2], r1
  mov &[<Box> OtherBox.x], acu
  jle r1, &[!corner3]

  ;; ax < bx2
  mov &[<Box> FrogBox.x2], r1
  mov &[<Box> OtherBox.x2], acu
  jgt r1, &[!corner3]

  ;; ay >= by
  mov &[<Box> FrogBox.y2], r1
  mov &[<Box> OtherBox.y], acu
  jle r1, &[!corner3]

  ;; ay < by2
  mov &[<Box> FrogBox.y2], r1
  mov &[<Box> OtherBox.y2], acu
  jgt r1, &[!corner3]

  ;; Collision!
  mov $01, acu
  ret

corner3:
;; Test corner 3
  ;; if (ax >= bx && ax < bx2 && ay > by && ay <= by2)

  ;; ax >= bx
  mov &[<Box> FrogBox.x], r1
  mov &[<Box> OtherBox.x], acu
  jlt r1, &[!end_of_collision_routine]

  ;; ax < bx2
  mov &[<Box> FrogBox.x], r1
  mov &[<Box> OtherBox.x2], acu
  jge r1, &[!end_of_collision_routine]

  ;; ay >= by
  mov &[<Box> FrogBox.y2], r1
  mov &[<Box> OtherBox.y], acu
  jle r1, &[!end_of_collision_routine]

  ;; ay < by2
  mov &[<Box> FrogBox.y2], r1
  mov &[<Box> OtherBox.y2], acu
  jgt r1, &[!end_of_collision_routine]

  ;; Collision!
  mov $01, acu
  ret

end_of_collision_routine:
  mov $00, acu
  ret


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
