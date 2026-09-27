"""Exact geometry of an 8-atom conventional silicon cell; no DFT."""
import numpy as np
import matplotlib.pyplot as plt
from itertools import product, combinations

a = 5.431  # @a
elevation = 25  # @elevation
azimuth = 35  # @azimuth
fractional = np.array([
    [0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0],
    [.25, .25, .25], [.25, .75, .75],
    [.75, .25, .75], [.75, .75, .25]
])
positions = a * fractional
nearest = np.sqrt(3) * a / 4
fig = plt.figure(figsize=(6.5, 5))
ax = fig.add_subplot(projection="3d")
corners = np.array(list(product([0, a], repeat=3)))
for p, q in combinations(corners, 2):
    if np.count_nonzero(p != q) == 1:
        ax.plot(*np.array([p, q]).T, color="#b1c4ca", linewidth=1)
for p, q in combinations(positions, 2):
    if np.isclose(np.linalg.norm(p - q), nearest):
        ax.plot(*np.array([p, q]).T, color="#559d89", linewidth=2)
ax.scatter(*positions.T, s=160, color="#087d68", edgecolors="white")
ax.set(xlabel="x (Å)", ylabel="y (Å)", zlabel="",
       title="Si — conventional diamond cell", xlim=(0, a),
       ylim=(0, a), zlim=(0, a))
ax.set_box_aspect([1, 1, 1])
ax.view_init(elev=elevation, azim=azimuth)
fig.subplots_adjust(left=0.12, right=0.86, bottom=0.10, top=0.90)
fig.text(0.04, 0.50, "z (Å)", rotation=90, va="center")
plt.show()
print(f"Conventional cell: 8 atoms, volume = {a**3:.4f} A^3")
print(f"Nearest-neighbour distance = {nearest:.6f} A")
print("Periodic neighbours outside the cell are not drawn.")
np.savetxt("silicon_positions.csv", positions, delimiter=",", header="x_A,y_A,z_A")
