//go:build ignore

// runs.go - print the runs of (nearly) constant colour along a line of an image.
// go run runs.go img.png h|v fixed from to [tol] [minlen]
//
//	h: along x at row y=fixed, v: along y at column x=fixed
package main

import (
	"fmt"
	"image"
	_ "image/png"
	"os"
	"strconv"
)

func main() {
	f, _ := os.Open(os.Args[1])
	img, _, err := image.Decode(f)
	if err != nil {
		panic(err)
	}
	n := func(i int, d int) int {
		if len(os.Args) <= i {
			return d
		}
		v, _ := strconv.Atoi(os.Args[i])
		return v
	}
	axis := os.Args[2]
	fixed, from, to, tol, minlen := n(3, 0), n(4, 0), n(5, 100), n(6, 6), n(7, 1)
	get := func(i int) (int, int, int) {
		var x, y int
		if axis == "h" {
			x, y = i, fixed
		} else {
			x, y = fixed, i
		}
		r, g, b, _ := img.At(x, y).RGBA()
		return int(r >> 8), int(g >> 8), int(b >> 8)
	}
	abs := func(a int) int {
		if a < 0 {
			return -a
		}
		return a
	}
	sr, sg, sb := get(from)
	start := from
	flush := func(end int) {
		if end-start+1 >= minlen {
			fmt.Printf("%4d-%-4d (%4d) #%02x%02x%02x\n", start, end, end-start+1, sr, sg, sb)
		}
	}
	for i := from + 1; i <= to; i++ {
		r, g, b := get(i)
		if abs(r-sr) > tol || abs(g-sg) > tol || abs(b-sb) > tol {
			flush(i - 1)
			sr, sg, sb, start = r, g, b, i
		}
	}
	flush(to)
}
