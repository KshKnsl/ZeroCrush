from math import dist
from shapely.geometry import box as shapely_box

def _euclidean(p1, p2):
	return float(dist(p1, p2))

# Calculate shortest distance between two rectangle
def rect_distance(rect1, rect2):
	(x1, y1, x1b, y1b) = rect1
	(x2, y2, x2b, y2b) = rect2
	return float(shapely_box(x1, y1, x1b, y1b).distance(shapely_box(x2, y2, x2b, y2b)))

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