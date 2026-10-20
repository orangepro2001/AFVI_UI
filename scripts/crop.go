//go:build ignore

// crop.go - crop (and optionally scale up) a region of a PNG: go run crop.go in.png out.png x y w h [scale]
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"strconv"
)

func main() {
	if len(os.Args) < 7 {
		fmt.Fprintln(os.Stderr, "usage: crop in out x y w h [scale]")
		os.Exit(2)
	}
	f, err := os.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	defer f.Close()
	src, err := png.Decode(f)
	if err != nil {
		panic(err)
	}
	n := func(i int) int {
		v, e := strconv.Atoi(os.Args[i])
		if e != nil {
			panic(e)
		}
		return v
	}
	x, y, w, h := n(3), n(4), n(5), n(6)
	scale := 1
	if len(os.Args) > 7 {
		scale = n(7)
	}
	dst := image.NewRGBA(image.Rect(0, 0, w*scale, h*scale))
	if scale == 1 {
		draw.Draw(dst, dst.Bounds(), src, image.Pt(x, y), draw.Src)
	} else {
		for py := 0; py < h*scale; py++ {
			for px := 0; px < w*scale; px++ {
				dst.Set(px, py, src.At(x+px/scale, y+py/scale))
			}
		}
	}
	if len(os.Args) > 8 {
		step := n(8)
		for py := 0; py < h*scale; py++ {
			for px := 0; px < w*scale; px++ {
				ax, ay := x+px/scale, y+py/scale
				onX := px%scale == 0 && ax%step == 0
				onY := py%scale == 0 && ay%step == 0
				if !onX && !onY {
					continue
				}
				strong := (onX && ax%(step*5) == 0) || (onY && ay%(step*5) == 0)
				c := color.RGBA{255, 0, 255, 255}
				if !strong {
					c = color.RGBA{0, 200, 255, 255}
				}
				if (onX && (py/2)%2 == 0) || (onY && (px/2)%2 == 0) || strong {
					dst.Set(px, py, c)
				}
			}
		}
	}
	o, err := os.Create(os.Args[2])
	if err != nil {
		panic(err)
	}
	defer o.Close()
	if err := png.Encode(o, dst); err != nil {
		panic(err)
	}
}
