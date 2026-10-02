"""Native GPAW example, reviewed against the official dielectric tutorial.
Requires GPAW, ASE, native numerical libraries and PAW datasets.
Not executed in the browser. Parameters illustrate workflow, not convergence.
Source: https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/dielectric_response/dielectric_response.html
"""
from ase.build import bulk
from gpaw import GPAW, PW, FermiDirac
from gpaw.response.df import DielectricFunction

symbol = "Si"  # @symbol
crystal = "diamond"  # @crystal
a = 5.431  # @a
cutoff = 300  # @cutoff
k = 4  # @k
bands = 24  # @bands

# Primitive cells: diamond Si has 2 atoms; fcc Al/Ag have 1.
# Lattice constants are starting structures, not relaxed predictions.
atoms = bulk(symbol, crystal, a=a)
metal = symbol in ("Al", "Ag")
stem = symbol.lower()
atoms.calc = GPAW(
    mode=PW(cutoff), xc="LDA", kpts=(k, k, k),
    occupations=FermiDirac(0.05 if metal else 0.001), txt=stem + "_ground_state.txt"
)
energy = atoms.get_potential_energy()
print("Primitive-cell ground-state energy (eV):", energy)

# Converge k-points and empty states for production calculations.
calc = atoms.calc
calc.diagonalize_full_hamiltonian(nbands=bands)
calc.write(stem + ".gpw", mode="all")

# ecut here controls the response matrix, not the ground-state PW basis.
df = DielectricFunction(
    calc=stem + ".gpw",
    frequencies={"type": "nonlinear", "domega0": 0.05},
    eta=0.1, ecut=50, nbands=bands, intraband=metal, rate=0.1,
    txt=stem + "_response.txt"
)
df.get_dielectric_function(direction="x", filename="df.csv")
print("Saved df.csv: energy, Re NLF, Im NLF, Re LF, Im LF")

# Finite-q EELS: q must connect points of the ground-state k grid.
if metal:
    df.get_eels_spectrum(q_c=[1.0 / k, 0, 0], filename="eels.csv")
    print("Saved eels.csv (3 columns); this is NOT the 5-column df.csv.")
print("Workflow example only. Converge k points, bands, cutoffs and smearing.")
