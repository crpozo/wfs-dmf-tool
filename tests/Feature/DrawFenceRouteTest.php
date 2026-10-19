<?php

namespace Tests\Feature;

use Tests\TestCase;

class DrawFenceRouteTest extends TestCase
{
    public function test_draw_fence_redirects_home_when_materials_are_missing(): void
    {
        $this->get('/drawfence')
            ->assertRedirect(route('quote.create'));
    }

    public function test_old_draw_fence_redirects_home_when_materials_are_missing(): void
    {
        $this->get('/drawfence_old')
            ->assertRedirect(route('quote.create'));
    }

    public function test_draw_fence_keeps_rendering_the_standard_view_with_session_materials(): void
    {
        $this->withSession([
            'step' => 4,
            'materials' => [
                1 => [
                    'code' => '40120',
                    'material' => 'Vinyl',
                    'style' => 'Privacy',
                    'design' => 'Solid',
                    'height' => '6 ft',
                    'color' => 'White',
                ],
            ],
        ])->get('/drawfence')
            ->assertOk()
            ->assertSee('<nav id="navbar"', false)
            ->assertDontSee('drawing-embedded', false);
    }

    public function test_embedded_draw_fence_requires_materials_without_a_preexisting_session(): void
    {
        $this->get('/embed/drawfence')
            ->assertStatus(422);
    }

    public function test_embedded_draw_fence_reuses_the_drawing_view_in_embed_mode(): void
    {
        $materials = json_encode([
            1 => [
                'code' => '40120',
                'material' => 'Vinyl',
                'style' => 'Privacy',
                'height' => '6',
                'color' => 'White',
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->get('/embed/drawfence?'.http_build_query([
            'materials' => $materials,
        ]));

        $response
            ->assertOk()
            ->assertSee('drawfence-embed.css', false)
            ->assertSee('drawfence-embed.js', false)
            ->assertSee('<nav id="navbar"', false)
            ->assertSee('Previous Step');

        $response->assertSessionHas('materials', json_decode($materials, true));

        $this->assertSame(
            "frame-ancestors 'self' https://www.westernfencesupply.com",
            $response->headers->get('Content-Security-Policy')
        );
    }

    public function test_embedded_draw_fence_rejects_invalid_material_json(): void
    {
        $this->get('/embed/drawfence?materials=not-json')
            ->assertStatus(422);
    }

    public function test_customizable_embed_uses_the_three_public_handoff_files(): void
    {
        $materials = json_encode([
            1 => [
                'code' => '12121',
                'material' => 'Aluminum',
                'type' => 'Residential',
                'height' => '4 Feet',
                'color' => 'Black',
                'style' => '2 rail smooth bottom residential',
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->get('/embed/drawfence/customizable?'.http_build_query([
            'materials' => $materials,
        ]));

        $response
            ->assertOk()
            ->assertDontSee('Restart Project')
            ->assertDontSee('Print Sketch')
            ->assertSee('--wfs-canvas-min-height', false)
            ->assertSee('minimumCanvasHeight', false)
            ->assertSee('buttonRect.bottom + 6', false)
            ->assertSee("toolbarVideoTooltip.addEventListener('pointerdown'", false)
            ->assertSee('suppressCanvasPointerInteraction(event, false)', false)
            ->assertDontSee('/* WFS_EMBED_CSS */', false)
            ->assertDontSee('/* WFS_EMBED_JS */', false);

        $this->assertFileExists(public_path('drawfence-embed/base.html'));
        $this->assertFileExists(public_path('drawfence-embed/embed.css'));
        $this->assertFileExists(public_path('drawfence-embed/embed.js'));

        $baseHtml = file_get_contents(public_path('drawfence-embed/base.html'));
        $this->assertStringNotContainsString('id="btnRestart"', $baseHtml);
        $this->assertStringNotContainsString('id="btnPrintSketch"', $baseHtml);
        $this->assertStringNotContainsString('@auth', $baseHtml);
        $this->assertStringNotContainsString('quoteRequestUserForm', $baseHtml);
        $this->assertStringNotContainsString('@auth', file_get_contents(public_path('drawfence-embed/embed.js')));
        $this->assertStringNotContainsString('@guest', file_get_contents(public_path('drawfence-embed/embed.js')));
        $this->assertStringNotContainsString('printFenceCanvas', file_get_contents(public_path('drawfence-embed/embed.js')));
        $this->assertStringNotContainsString('printSketchLogoUrl', file_get_contents(public_path('drawfence-embed/embed.js')));
        $this->assertStringContainsString('id="modalGates"', $baseHtml);
        $this->assertStringContainsString('id="panelDims"', $baseHtml);
        $this->assertStringContainsString("@assetv('js/s_sketch.js')", $baseHtml);
    }

    public function test_draw_fence_embed_example_contains_the_site_header_and_iframe(): void
    {
        $this->get('/examples/drawfence-embed')
            ->assertOk()
            ->assertSee('Homeowner')
            ->assertSee('Fence Education Hub')
            ->assertSee('Get a Free Quote')
            ->assertSee('Powder-Coated Aluminum')
            ->assertSee('Request a Material Quote')
            ->assertSee('ALUM.webp', false)
            ->assertSee('id="drawFenceFrame"', false)
            ->assertSee('/embed/drawfence/customizable?', false)
            ->assertSee('drawfence-example.css', false)
            ->assertSee('drawfence-example.js', false);
    }

    public function test_embed_adapter_is_injected_after_the_drawing_inline_scripts(): void
    {
        $materials = json_encode([
            1 => [
                'code' => '12121',
                'material' => 'Aluminum',
                'type' => 'Residential',
                'height' => '4 Feet',
                'color' => 'Black',
                'style' => '2 rail smooth bottom residential',
            ],
        ], JSON_THROW_ON_ERROR);

        $content = $this->get('/embed/drawfence?'.http_build_query([
            'materials' => $materials,
        ]))->assertOk()->getContent();

        $this->assertGreaterThan(
            strpos($content, 'printWindow.document.close()'),
            strpos($content, 'drawfence-embed.js')
        );
        $this->assertGreaterThan(
            strpos($content, 'drawfence-embed.js'),
            strripos($content, '</body>')
        );
    }
}
