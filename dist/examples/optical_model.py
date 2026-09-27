"""Lorentz teaching model. These curves are NOT a GPAW calculation."""
import numpy as np
import matplotlib.pyplot as plt

e0 = 3.4  # @e0
gamma = 0.35  # @gamma
strength = 12  # @strength
energy = np.linspace(0.0, 8.0, 401)  # eV

# epsilon is dimensionless; strength has units of eV^2
epsilon = 1 + strength / (e0**2 - energy**2 - 1j * gamma * energy)
loss = -np.imag(1 / epsilon)
kappa = np.sqrt(np.maximum(0, (np.abs(epsilon) - epsilon.real) / 2))
alpha = 2 * energy * kappa / 197.3269804  # nm^-1

fig, ax = plt.subplots(figsize=(7, 4.4))
ax.plot(energy, epsilon.real, label=r"$\epsilon_1$", color="#147d6a")
ax.plot(energy, epsilon.imag, label=r"$\epsilon_2$", color="#db9542")
ax.plot(energy, loss, label=r"$-\mathrm{Im}(1/\epsilon)$", color="#577bc4")
ax.set(xlabel="Photon energy (eV)", ylabel="Dimensionless response",
       title="Lorentz oscillator — teaching model")
ax.axhline(0, color="#c6d4d9", linewidth=0.8)
ax.grid(alpha=0.15)
ax.legend(frameon=False)
fig.tight_layout()
plt.show()
print(f"epsilon_2 peak: {energy[np.argmax(epsilon.imag)]:.3f} eV")
print(f"Loss peak:      {energy[np.argmax(loss)]:.3f} eV")
print(f"epsilon(0):    {epsilon[0].real:.6f}")
np.savetxt("optical_model.csv",
           np.column_stack((energy, epsilon.real, epsilon.imag, loss, alpha)),
           delimiter=",", header="energy_eV,epsilon1,epsilon2,loss,alpha_nm-1")
