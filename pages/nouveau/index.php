<!DOCTYPE html>
<html lang="fr">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Liste des messes</title>
	<meta name="description" content="">
	<meta name="keywords" content="">
  <!-- CSS -->
	<link href="index.css" rel="stylesheet">
  <link href="https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css" rel=" stylesheet">
  <!-- JS -->
  <script src="../../js/jquery-latest.js"></script>
  <script src="index.js"></script>
</head>

<body class="h-full w-full"><noscript><strong>Il faut activer le Javascript !!!</strong></noscript>
	<div class="h-full w-full isolate overflow-hidden bg-gray-900 py-24 sm:py-32">
		<img src="../../fond.jpg" style="z-index:-1;position: fixed; height: 100%; filter: brightness(20%)" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover object-right md:object-center">
		<div class="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl" aria-hidden="true" style="overflow-y:scroll"></div>
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<p class="mt-6 text-lg leading-8 text-gray-300">
                <a href="/" style="color: #3498db;"><span aria-hidden="true">&larr;</span>Accueil</a>
                <a href="/pages/liste_messes/" style="color: #3498db;"><span aria-hidden="true">&larr;</span>Retour</a>
            </p>
			<div class="mx-auto lg:mx-0">
				<h3 class="text-4xl font-bold tracking-tight text-white sm:text-6xl">Nouveau programme</h3>
				<p class="mt-6 text-lg leading-8 text-gray-300" style="text-align: justify;">Configurez ici votre nouveau programme.</p>
			</div>
			  
			<form id="create-program-form" class="mt-10 max-w-md mx-auto lg:mx-0">
				<div id="form_message" class="text-sm mb-4"></div>
				<div class="mb-4">
					<label for="paroisse" class="block text-sm font-medium text-gray-300">Paroisse</label>
					<select id="paroisse" name="paroisse" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white">
						<option value="">Sélectionnez une paroisse</option>
						<!-- Options will be populated dynamically or add static ones -->
					</select>
				</div>
				<div class="mb-4">
					<label for="template" class="block text-sm font-medium text-gray-300">Template</label>
					<select id="template" name="template" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white">
						<option value="">Sélectionnez un template</option>
						<!-- Options will be populated dynamically -->
					</select>
				</div>
				<div class="mb-4">
					<label for="occasion" class="block text-sm font-medium text-gray-300">Occasion</label>
					<input type="text" id="occasion" name="occasion" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white" placeholder="Ex: Messe ordinaire, Noël, etc.">
				</div>
				<div class="mb-4">
					<label for="lieu" class="block text-sm font-medium text-gray-300">Lieu</label>
					<input type="text" id="lieu" name="lieu" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white" placeholder="Ville ou lieu">
				</div>
				<div class="mb-4">
					<label for="date" class="block text-sm font-medium text-gray-300">Date</label>
					<input type="date" id="date" name="date" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white">
				</div>
				<div class="mb-4">
					<label for="description" class="block text-sm font-medium text-gray-300">Description</label>
					<textarea id="description" name="description" rows="4" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white" placeholder="Description du programme"></textarea>
				</div>
				<button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Créer le programme</button>
			</form>
			  
		</div>
	</div>

</body>

</html>