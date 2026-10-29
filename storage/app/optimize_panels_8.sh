#!/bin/bash

# Extract arguments
length=$1
#panel6=$2
#panel8=$3

# Define the linear programming problem using GLPK syntax
echo "param length := $length;" > /tmp/panels.mod
#echo "param panel6 := $panel6;" >> /tmp/panels.mod
#echo "param panel8 := $panel8;" >> /tmp/panels.mod
cat << 'EOF' >> /tmp/panels.mod
var x, integer, >=0;
minimize z: 8 * x;
s.t. length_constraint: 8 * x >= length;
solve;
printf "P6%g", 0;
printf "P8%gEND", x;
#printf "Optimal objective value: %g\n", z;
EOF

# Solve the linear programming problem using GLPK
glpsol --math /tmp/panels.mod

# Clean up temporary files
rm /tmp/panels.mod

