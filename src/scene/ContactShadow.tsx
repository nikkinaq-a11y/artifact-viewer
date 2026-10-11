import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  Group,
  Mesh,
  MeshDepthMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
} from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

/**
 * Every contact-shadow plane in the scene. Each layer hides all of them while it renders,
 * not only itself — otherwise a layer stacked a fraction of a millimetre above another
 * sees that plane as a solid object touching the pedestal and darkens the whole square.
 */
const planes = new Set<Object3D>();

type Props = {
  /** Height of the receiving surface, metres. */
  y: number;
  /** Side of the square the shadow covers, metres. */
  size: number;
  /** How far above the surface objects still darken it, metres. */
  far: number;
  blur: number;
  opacity: number;
  resolution?: number;
};

/**
 * A soft contact shadow on a surface: the scene is rendered from just under the surface
 * looking up, parts close to it come out dark, and the result is blurred onto a plane.
 *
 * Replaces drei's `ContactShadows`, which renders nothing at all on a raised surface. Its
 * blur pass draws a plane fixed at the world origin through the shadow camera; that only
 * works when the shadow sits at ground level. On a 1 m pedestal the plane is a metre behind
 * the camera, so each blur pass cleared the shadow to empty — there was never a contact
 * shadow on the pedestal. Here the blur has its own camera, independent of where the
 * shadow is.
 */
export function ContactShadow({ y, size, far, blur, opacity, resolution = 1024 }: Props) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const group = useRef<Group>(null);
  const shadowCamera = useRef<OrthographicCamera>(null);

  const r = useMemo(() => {
    const target = new WebGLRenderTarget(resolution, resolution);
    const targetBlur = new WebGLRenderTarget(resolution, resolution);
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false;

    // Darker the closer to the surface: alpha falls off with depth across [0, far].
    const depth = new MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: new Color('#000000') };
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        .replace(
          'vec4( vec3( 1.0 - fragCoordZ ), opacity );',
          'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );',
        );
    };

    // Full-screen quad and camera for the blur passes, set up so the quad exactly fills
    // the view with an identity UV mapping, wherever the shadow itself sits.
    const blurQuad = new Mesh(new PlaneGeometry(2, 2));
    const blurCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
    blurCamera.position.z = 1;
    blurCamera.updateMatrixWorld();
    const hBlur = new ShaderMaterial(HorizontalBlurShader);
    const vBlur = new ShaderMaterial(VerticalBlurShader);
    hBlur.depthTest = vBlur.depthTest = false;

    const plane = new PlaneGeometry(size, size).rotateX(Math.PI / 2);
    return { target, targetBlur, depth, blurQuad, blurCamera, hBlur, vBlur, plane };
  }, [resolution, size]);

  useEffect(
    () => () => {
      r.target.dispose();
      r.targetBlur.dispose();
      r.depth.dispose();
      r.hBlur.dispose();
      r.vBlur.dispose();
      r.plane.dispose();
      r.blurQuad.geometry.dispose();
    },
    [r],
  );

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    planes.add(g);
    return () => {
      planes.delete(g);
    };
  }, []);

  const blurPass = (amount: number) => {
    r.blurQuad.material = r.hBlur;
    r.hBlur.uniforms.tDiffuse.value = r.target.texture;
    r.hBlur.uniforms.h.value = amount / 256;
    gl.setRenderTarget(r.targetBlur);
    gl.render(r.blurQuad, r.blurCamera);

    r.blurQuad.material = r.vBlur;
    r.vBlur.uniforms.tDiffuse.value = r.targetBlur.texture;
    r.vBlur.uniforms.v.value = amount / 256;
    gl.setRenderTarget(r.target);
    gl.render(r.blurQuad, r.blurCamera);
  };

  useFrame(() => {
    const cam = shadowCamera.current;
    if (!cam) return;

    const background = scene.background;
    const override = scene.overrideMaterial;
    const fog = scene.fog;
    const shown = [...planes].map((p) => [p, p.visible] as const);
    for (const [p] of shown) p.visible = false;
    scene.background = null;
    scene.fog = null;
    scene.overrideMaterial = r.depth;

    gl.setRenderTarget(r.target);
    gl.clear();
    gl.render(scene, cam);
    if (blur > 0) {
      blurPass(blur);
      blurPass(blur * 0.4);
    }
    gl.setRenderTarget(null);

    scene.overrideMaterial = override;
    scene.background = background;
    scene.fog = fog;
    for (const [p, v] of shown) p.visible = v;
  });

  return (
    <group ref={group} position={[0, y, 0]} rotation-x={Math.PI / 2}>
      <mesh geometry={r.plane} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          transparent
          map={r.target.texture}
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      <orthographicCamera
        ref={shadowCamera}
        args={[-size / 2, size / 2, size / 2, -size / 2, 0, far]}
      />
    </group>
  );
}
