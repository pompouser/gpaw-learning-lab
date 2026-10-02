"""Authored teaching model, NOT fitted, experimental or GPAW material data.
Si: Lorentz mechanism; Al: Drude mechanism; Ag: Drude + Lorentz mechanism.
E and damping use eV; strength uses eV**2. Convention: exp(-i omega t).
"""
import numpy as np
import matplotlib.pyplot as plt

symbol = "Si"  # @symbol
e0 = 3.4  # @e0
gamma = 0.35  # @gamma
strength = 12  # @strength
wp = 0  # @wp
energy = np.linspace(0.05, 25.0, 501)  # exclude the Drude singularity at zero

epsilon = (1 + strength / (e0**2 - energy**2 - 1j * gamma * energy)
           - wp**2 / (energy**2 + 1j * gamma * energy))
loss = -np.imag(1 / epsilon)
kappa = np.sqrt(np.maximum(0, (np.abs(epsilon) - epsilon.real) / 2))
alpha = 2 * energy * kappa / 197.3269804  # nm^-1
fig, axes = plt.subplots(2, 1, figsize=(7, 6), sharex=True)
axes[0].plot(energy, epsilon.real, label=r"$\epsilon_1$", color="#147d6a")
axes[0].plot(energy, epsilon.imag, label=r"$\epsilon_2$", color="#b87922")
axes[0].set(ylabel="Dielectric function", ylim=(-20, 30))
axes[0].text(.98, .95, "Display limited to [-20, 30]; CSV is uncut",
             transform=axes[0].transAxes, ha="right", va="top", fontsize=8)
axes[1].plot(energy, loss, label="Loss function", color="#577bc4")
axes[1].set(xlabel="Energy (eV)", ylabel="Dimensionless loss")
for ax in axes:
    ax.legend(frameon=False)
    ax.grid(alpha=.15)
fig.suptitle(symbol + " mechanism — teaching model, not material prediction")
fig.tight_layout()
plt.show()
print("TEACHING MODEL; not GPAW or measured data:", symbol)
print(f"Sampled loss maximum: {energy[np.argmax(loss)]:.4f} eV")
print("Raw epsilon, loss and alpha values are saved without clipping.")
np.savetxt(symbol.lower() + "_teaching_model.csv",
           np.column_stack((energy, epsilon.real, epsilon.imag, loss, alpha)),
           delimiter=",", header="TEACHING MODEL\nenergy_eV,re,im,loss,alpha_nm-1")
