//go:build ignore

// diffgrid.go - where two screenshots differ: a heat map of mean absolute differences per cell.
//
//	go run scripts/diffgrid.go ours.png ref.png dx dy cell [x y w h]
//
// ours is a screenshot of the running UI (scripts/snap.sh), ref a design image. Pixel (x, y) of
// ours is compared with pixel (x+dx, y+dy) of ref, so dx/dy are the capture offsets of
// design/spec/00-frame.md. The region (default: all of ours) is cut into cell x cell squares; each
// one prints as '.' below 10, else the tens digit of its mean absolute difference (0-255, mean of
// R, G and B). Then the mean over the whole region and the twelve worst cells.
//
// Text differs everywhere (Linux falls back to other fonts), so judge by lines, boxes and fills.
package main

import (
	"fmt"
	"image"
	_ "image/png"
	"os"
	"sort"
	"strconv"
)

func load(path string) image.Image {
	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	if err != nil {
		fmt.Fprintln(os.Stderr, path+":", err)
		os.Exit(1)
	}
	return img
}

func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func main() {
	if len(os.Args) != 6 && len(os.Args) != 10 {
		fmt.Fprintln(os.Stderr, "usage: diffgrid ours.png ref.png dx dy cell [x y w h]")
		os.Exit(2)
	}
	ours, ref := load(os.Args[1]), load(os.Args[2])
	n := make([]int, len(os.Args)-3)
	for i := range n {
		v, err := strconv.Atoi(os.Args[3+i])
		if err != nil {
			fmt.Fprintln(os.Stderr, "not a number:", os.Args[3+i])
			os.Exit(2)
		}
		n[i] = v
	}
	dx, dy, cell := n[0], n[1], n[2]
	b := ours.Bounds()
	x0, y0, w, h := b.Min.X, b.Min.Y, b.Dx(), b.Dy()
	if len(n) == 7 {
		x0, y0, w, h = n[3], n[4], n[5], n[6]
	}
	if cell < 1 {
		fmt.Fprintln(os.Stderr, "cell must be at least 1")
		os.Exit(2)
	}

	type spot struct {
		x, y int
		mean float64
	}
	var spots []spot
	var total, count int
	fmt.Printf("region %d,%d %dx%d  cell %d\n", x0, y0, w, h, cell)
	for cy := y0; cy < y0+h; cy += cell {
		line := make([]byte, 0, w/cell+1)
		for cx := x0; cx < x0+w; cx += cell {
			var sum, cnt int
			for y := cy; y < cy+cell && y < y0+h; y++ {
				for x := cx; x < cx+cell && x < x0+w; x++ {
					if !image.Pt(x, y).In(b) || !image.Pt(x+dx, y+dy).In(ref.Bounds()) {
						continue
					}
					r1, g1, b1, _ := ours.At(x, y).RGBA()
					r2, g2, b2, _ := ref.At(x+dx, y+dy).RGBA()
					sum += abs(int(r1>>8)-int(r2>>8)) + abs(int(g1>>8)-int(g2>>8)) + abs(int(b1>>8)-int(b2>>8))
					cnt += 3
				}
			}
			mean := 0.0
			if cnt > 0 {
				mean = float64(sum) / float64(cnt)
			}
			total += sum
			count += cnt
			spots = append(spots, spot{cx, cy, mean})
			if mean < 10 {
				line = append(line, '.')
			} else {
				line = append(line, byte('0'+min(int(mean)/10, 9)))
			}
		}
		fmt.Printf("%4d %s\n", cy, line)
	}
	if count > 0 {
		fmt.Printf("mean abs diff: %.2f\n", float64(total)/float64(count))
	}
	sort.SliceStable(spots, func(i, j int) bool { return spots[i].mean > spots[j].mean })
	for i := 0; i < len(spots) && i < 12; i++ {
		fmt.Printf("  worst %2d: x=%d y=%d mean=%.1f\n", i+1, spots[i].x, spots[i].y, spots[i].mean)
	}
}
