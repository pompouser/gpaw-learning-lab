"""GPAW five-column dielectric CSV. df.csv must be in the current directory."""
import numpy as np
import matplotlib.pyplot as plt

# The lab supplies a normalized numeric copy of the imported CSV as df.csv.
data = np.loadtxt("df.csv", delimiter=",", comments="#", ndmin=2)
if data.shape[1] != 5 or not np.all(np.isfinite(data)):
    raise ValueError("Expected five finite numeric columns.")
if not np.all(np.diff(data[:, 0]) > 0):
    raise ValueError("Energy must be strictly increasing.")
energy = data[:, 0]
epsilon_nlf = data[:, 1] + 1j * data[:, 2]
epsilon_lf = data[:, 3] + 1j * data[:, 4]

fig, axes = plt.subplots(2, 1, figsize=(7, 6), sharex=True)
axes[0].plot(energy, epsilon_nlf.imag, label="Without local fields", color="#db9542")
axes[0].plot(energy, epsilon_lf.imag, label="With local fields", color="#147d6a")
axes[0].set(ylabel=r"Im $\epsilon$", title="Imported dielectric response")
for eps, label, color in [(epsilon_nlf, "NLF", "#db9542"),
                           (epsilon_lf, "LF", "#147d6a")]:
    denominator = eps.real**2 + eps.imag**2
    loss = np.divide(eps.imag, denominator, out=np.full(len(eps), np.nan),
                     where=denominator > 0)
    axes[1].plot(energy, loss, label=label, color=color)
axes[1].set(xlabel="Energy (eV)", ylabel=r"$-\mathrm{Im}(1/\epsilon)$")
for ax in axes:
    ax.legend(frameon=False)
    ax.grid(alpha=.2)
fig.tight_layout()
plt.show()
print(f"Loaded {len(energy)} points: {energy[0]:.3f} to {energy[-1]:.3f} eV")
print(f"Sampled LF Im(epsilon) maximum: {energy[np.argmax(epsilon_lf.imag)]:.3f} eV")
print("Convergence cannot be inferred from this CSV alone.")
