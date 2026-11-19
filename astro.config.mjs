// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://arborist.sh',
	integrations: [
		starlight({
			title: 'Graft',
			description:
				'One golden Tart VM image for your Mac dev box and your ephemeral CI runners.',
			logo: { src: './src/assets/graft-mark.svg', alt: 'Graft' },
			favicon: '/favicon.svg',
			customCss: ['./src/styles/theme.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/Arborist-sh/graft' },
			],
			editLink: {
				baseUrl: 'https://github.com/Arborist-sh/arborist.sh/edit/main/',
			},
			lastUpdated: true,
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ label: 'What is Graft?', slug: 'docs/getting-started' },
						{ label: 'Install', slug: 'docs/install' },
					],
				},
				{
					label: 'Images (saplings)',
					items: [
						{ label: '.graft recipes', slug: 'docs/recipes' },
						{ label: 'Example recipes', slug: 'docs/examples' },
						{ label: 'React Native iOS fast builds', slug: 'docs/rn-ios-fast-builds' },
					],
				},
				{
					label: 'Dev boxes (nests)',
					items: [{ label: 'graft nest', slug: 'docs/nest' }],
				},
				{
					label: 'CI runners',
					items: [
						{ label: 'Ephemeral runners', slug: 'docs/runners' },
						{ label: 'Multi-host fleets (Orchard)', slug: 'docs/orchard' },
						{ label: 'Health & monitoring', slug: 'docs/health' },
						{ label: 'Headless & EC2 Mac hosts', slug: 'docs/headless-hosts' },
					],
				},
				{
					label: 'Desktop app',
					items: [{ label: 'Graft.app', slug: 'docs/desktop-app' }],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'CLI reference', slug: 'docs/cli' },
						{ label: 'Configuration', slug: 'docs/configuration' },
						{ label: 'Architecture', slug: 'docs/architecture' },
						{ label: 'VS Code extension', slug: 'docs/vscode-extension' },
					],
				},
			],
		}),
	],
});
