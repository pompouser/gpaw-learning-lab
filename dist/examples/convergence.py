"""Synthetic energies for learning convergence analysis; NOT GPAW results."""
import numpy as np
import matplotlib.pyplot as plt

tolerance = 2  # @tolerance
cutoff = np.array([250, 300, 350, 400, 450, 500, 550])
energy = np.array([-5.293, -5.311, -5.320, -5.324,
                   -5.326, -5.327, -5.3275])  # eV / atom
delta = 1000 * np.abs(np.diff(energy))  # meV / atom
candidates = [i for i in range(1, len(energy) - 1)
              if np.all(delta[i-1:] <= tolerance + 1e-9)]
for ecut, difference in zip(cutoff[1:], delta):
    print(f"{ecut:3d} eV: successive difference = {difference:7.3f} meV/atom")
if candidates:
    print(f"Candidate: {cutoff[candidates[0]]} eV; tolerance {tolerance} meV/atom")
else:
    print("No candidate with a higher-cutoff verification point. Add data.")
fig, axes = plt.subplots(2, 1, figsize=(7, 5.8), sharex=True)
axes[0].plot(cutoff, energy, "o-", color="#147d6a")
axes[0].set(ylabel="Energy (eV / atom)", title="Synthetic convergence exercise")
axes[1].plot(cutoff[1:], delta, "o-", color="#db9542")
axes[1].axhline(tolerance, linestyle="--", color="#577bc4", label="Tolerance")
axes[1].set(xlabel="Plane-wave cutoff (eV)", ylabel="Difference (meV / atom)")
axes[1].legend()
for ax in axes:
    ax.grid(alpha=.2)
fig.tight_layout()
plt.show()
