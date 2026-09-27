"""Native GPAW example, reviewed against the official dielectric tutorial.
Requires GPAW, ASE, native numerical libraries and PAW datasets.
Not executed in the browser. Parameters illustrate workflow, not convergence.
Source: https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/dielectric_response/dielectric_response.html
"""
from ase.build import bulk
from gpaw import GPAW, PW, FermiDirac
from gpaw.response.df import DielectricFunction

cutoff = 300  # @cutoff
k = 4  # @k
bands = 24  # @bands

# ASE's default diamond primitive cell contains 2 atoms.
atoms = bulk("Si", "diamond", a=5.431)
atoms.calc = GPAW(
    mode=PW(cutoff), xc="LDA", kpts=(k, k, k),
    occupations=FermiDirac(0.001), txt="si_ground_state.txt"
)
energy = atoms.get_potential_energy()
print("Primitive-cell ground-state energy (eV):", energy)

# Converge k-points and empty states for production calculations.
calc = atoms.calc
calc.diagonalize_full_hamiltonian(nbands=bands)
calc.write("si.gpw", mode="all")

# ecut here controls the response matrix, not the ground-state PW basis.
df = DielectricFunction(
    calc="si.gpw",
    frequencies={"type": "nonlinear", "domega0": 0.05},
    eta=0.1, ecut=50, nbands=bands, intraband=False,
    txt="si_response.txt"
)
df.get_dielectric_function(direction="x", filename="df.csv")
print("Saved df.csv: energy, Re NLF, Im NLF, Re LF, Im LF")
