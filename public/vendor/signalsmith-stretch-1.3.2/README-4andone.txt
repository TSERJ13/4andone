Local change to SignalsmithStretch.mjs (everything else is the upstream 1.3.2 build, MIT licence):
the worklet's input copy also accepts Int16Array buffers (widened to float per block), so a decoded track can be
kept as 16-bit in the audio thread: half the memory. Float32Array buffers behave exactly as before.
