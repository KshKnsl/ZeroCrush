from math import dist

def _euclidean(p1, p2):
	return float(dist(p1, p2))

def progress(frame_count):
	import sys
	sys.stdout.write('\r')
	if frame_count % 2 == 0:
		sys.stdout.write("Processing .. ")
	else:
		sys.stdout.write("Processing .  ")
	sys.stdout.flush()

def kinetic_energy(point1, point2, time_step):
	speed = _euclidean(point1, point2) / time_step
	return int(0.5 * speed ** 2)