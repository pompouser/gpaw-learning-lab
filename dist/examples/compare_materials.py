"""Compare authored teaching mechanisms; NOT measured or GPAW material data."""
import numpy as np
import matplotlib.pyplot as plt

observable = "loss"  # @observable
energy = np.linspace(0.05, 25.0, 501)
# (resonance eV, damping eV, oscillator strength eV^2, plasma energy eV)
presets = {"Si": (3.4, .35, 12, 0), "Al": (3.4, .3, 0, 15),
           "Ag": (4.5, .35, 60, 9)}
labels = {"loss": "Loss function (dimensionless)",
          "im": "Im epsilon (dimensionless)",
          "alpha": "Absorption coefficient (nm^-1)"}
colors = {"Si": "#147d6a", "Al": "#b87922", "Ag": "#577bc4"}
fig, ax = plt.subplots(figsize=(7, 4.5))
columns = [energy]
for symbol, (e0, gamma, strength, wp) in presets.items():
    eps = 1 + strength / (e0**2 - energy**2 - 1j * gamma * energy) - wp**2 / (energy**2 + 1j * gamma * energy)
    kappa = np.sqrt(np.maximum(0, (np.abs(eps) - eps.real) / 2))
    values = {"im": eps.imag, "loss": -np.imag(1 / eps),
              "alpha": 2 * energy * kappa / 197.3269804}[observable]
    columns.append(values)
    ax.plot(energy, values, label=symbol + " model", color=colors[symbol])
    print(symbol, "sampled maximum:", round(float(energy[np.argmax(values)]), 4), "eV")
ax.set(xlabel="Energy (eV)", ylabel=labels[observable],
       title="Same energy grid; teaching mechanisms, not material predictions")
ax.legend(frameon=False)
ax.grid(alpha=.15)
fig.tight_layout()
plt.show()
np.savetxt("compare_models.csv", np.column_stack(columns), delimiter=",",
           header="TEACHING MODELS; NOT GPAW/experiment\nenergy_eV,Si,Al,Ag")
