#!/bin/bash

# Extract arguments
length=$1

# Define the linear programming problem using GLPK syntax
echo "param length := $length;" > /tmp/panels_prefer_6.mod
cat << 'EOF' >> /tmp/panels_prefer_6.mod
var x, integer, >=0;  # Number of 6-foot panels
var y, integer, >=0;  # Number of 8-foot panels

# Objective: Minimize total panel usage, with a preference for 6-foot panels
minimize z: (6 * x + 8 * y) + 0.01 * y;

# Constraint to cover the length
s.t. length_constraint: 6 * x + 8 * y >= length;

solve;

# Output the quantities of each panel type
printf "P6%g", x;
printf "P8%gEND", y;
EOF

# Solve the linear programming problem using GLPK
glpsol --math /tmp/panels_prefer_6.mod

# Clean up temporary files
rm /tmp/panels_prefer_6.mod
