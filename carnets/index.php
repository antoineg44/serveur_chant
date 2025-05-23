<!DOCTYPE html>
<html lang="fr">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Carnet de chants</title>
	<meta name="description" content="">
	<meta name="keywords" content="">
	<link href="https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css" rel=" stylesheet">
	<script src="../js/config.js"></script>
	<!--Regular Datatables CSS-->
	<link href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.min.css" rel="stylesheet">
	<!--Responsive Extension Datatables CSS-->
	<link href="https://cdn.datatables.net/responsive/2.2.3/css/responsive.dataTables.min.css" rel="stylesheet">

	<style>
		/*Overrides for Tailwind CSS */

		/*Form fields*/
		.dataTables_wrapper select,
		.dataTables_wrapper .dataTables_filter input {
			color: #4a5568;
			/*text-gray-700*/
			padding-left: 1rem;
			/*pl-4*/
			padding-right: 1rem;
			/*pl-4*/
			padding-top: .5rem;
			/*pl-2*/
			padding-bottom: .5rem;
			/*pl-2*/
			line-height: 1.25;
			/*leading-tight*/
			border-width: 2px;
			/*border-2*/
			border-radius: .25rem;
			border-color: #edf2f7;
			/*border-gray-200*/
			background-color: #edf2f7;
			/*bg-gray-200*/
		}

		/*Row Hover*/
		table.dataTable.hover tbody tr:hover,
		table.dataTable.display tbody tr:hover {
			background-color: #ebf4ff;
			/*bg-indigo-100*/
		}

		/*Pagination Buttons*/
		.dataTables_wrapper .dataTables_paginate .paginate_button {
			font-weight: 700;
			/*font-bold*/
			border-radius: .25rem;
			/*rounded*/
			border: 1px solid transparent;
			/*border border-transparent*/
		}

		/*Pagination Buttons - Current selected */
		.dataTables_wrapper .dataTables_paginate .paginate_button.current {
			color: #fff !important;
			/*text-white*/
			box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1), 0 1px 2px 0 rgba(0, 0, 0, .06);
			/*shadow*/
			font-weight: 700;
			/*font-bold*/
			border-radius: .25rem;
			/*rounded*/
			background: #667eea !important;
			/*bg-indigo-500*/
			border: 1px solid transparent;
			/*border border-transparent*/
		}

		/*Pagination Buttons - Hover */
		.dataTables_wrapper .dataTables_paginate .paginate_button:hover {
			color: #fff !important;
			/*text-white*/
			box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1), 0 1px 2px 0 rgba(0, 0, 0, .06);
			/*shadow*/
			font-weight: 700;
			/*font-bold*/
			border-radius: .25rem;
			/*rounded*/
			background: #667eea !important;
			/*bg-indigo-500*/
			border: 1px solid transparent;
			/*border border-transparent*/
		}

		/*Add padding to bottom border */
		table.dataTable.no-footer {
			border-bottom: 1px solid #e2e8f0;
			/*border-b-1 border-gray-300*/
			margin-top: 0.75em;
			margin-bottom: 0.75em;
		}

		/*Change colour of responsive icon*/
		table.dataTable.dtr-inline.collapsed>tbody>tr>td:first-child:before,
		table.dataTable.dtr-inline.collapsed>tbody>tr>th:first-child:before {
			background-color: #667eea !important;
			/*bg-indigo-500*/
		}
	</style>



</head>

<?php
$carnet = null;
if(isset($_GET['carnet'])) {
	$carnet = (String) trim($_GET['carnet']);
}

?>

<body class="h-full w-full"><noscript><strong>Il faut activer le Javascript !!!</strong></noscript>
    <img src="../fond.jpg" style="z-index:-1;position: fixed; height: 100%; filter: brightness(20%)" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover object-right md:object-center">
    
	<?php 
		if($carnet == null) {
	?>
	<div id="contenu" class="mx-auto max-w-6xl px-6 lg:px-8" style="margin-top:20px;margin-bottom:20px;">
		<p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh" style="color: #3498db;"><span aria-hidden="true">&larr;</span>Accueil</a></p>
        <div class="mx-auto max-w-2xl lg:mx-0">
            <h2 class="text-4xl font-bold tracking-tight text-white sm:text-4xl">Carnets de chants</h2>
            <p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh/carnets?carnet=paroisse_nantes" style="color: #3498db;">Lien vers l'ancien carnet de chants de la paroisse Notre Dame de Nantes (version 2014)<span aria-hidden="true">&rarr;</span></a></p>
            <p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh/carnets?carnet=paroisse_nantes_v2" style="color: #3498db;">Lien vers le nouveau carnet de chants de la paroisse Notre Dame de Nantes (version 2024)<span aria-hidden="true">&rarr;</span></a></p>
        </div>
    <div/>
	<?php
		}
	?>
	<?php if($carnet == "paroisse_nantes") { ?>
    <div id="contenu" class="mx-auto max-w-6xl px-6 lg:px-8" style="margin-top:20px;margin-bottom:20px;">
		<p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh" style="color: #3498db;"><span aria-hidden="true">&larr;</span>Accueil</a></p>
        <div class="mx-auto max-w-2xl lg:mx-0">
            <h2 class="text-4xl font-bold tracking-tight text-white sm:text-4xl">Anciens carnet de chants de la paroisse notre Dame de Nantes :</h2>
            <p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh/carnets/lists/Paroisse NDDN - Carnet de chants 2014.pdf" target="_blank" style="color: #3498db;">Lien vers le carnets de chants</a></p>
            <p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh/carnets/lists/Table des matières - Par thème.pdf" target="_blank" style="color: #3498db;">Lien vers la table des matière par thème</a></p>
        </div>
    <div/>
	<?php } ?>
	<?php if($carnet == "paroisse_nantes_v2") { ?>
    <div id="contenu" class="mx-auto max-w-6xl px-6 lg:px-8" style="margin-top:20px;margin-bottom:20px;">
		<p class="mt-6 text-lg leading-8 text-gray-300"><a href="https://partitions.ovh" style="color: #3498db;"><span aria-hidden="true">&larr;</span>Accueil</a></p>
        <div class="mx-auto max-w-2xl lg:mx-0">
            <h2 class="text-4xl font-bold tracking-tight text-white sm:text-4xl">[En construction !] Nouveaux carnet de chants de la paroisse notre Dame de Nantes</h2>
        </div>
    <div/>
	<?php } ?>

	<?php if($carnet != null) { ?>
	<!--Container-->
	<div class="container w-full mx-auto px-2" style="margin-top:20px;margin-bottom:20px;">
		<!--Card-->
		<div id='recipients' class="p-8 mt-6 lg:mt-0 rounded shadow bg-white bg-gray-100 text-gray-900 tracking-wider leading-normal">
            <table id="chants" class="display" style="width:100%">
                <thead>
                    <tr>
                        <th>Num</th>
                        <th>Chants</th>
                        <th>Liens</th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <th>Num</th>
                        <th>Chants</th>
                        <th>Liens</th>
                    </tr>
                </tfoot>
            </table>
		</div>
		<!--/Card-->
	</div>
	<!--/container-->

	<!-- jQuery -->
	<script type="text/javascript" src="https://code.jquery.com/jquery-3.4.1.min.js"></script>

	<!--Datatables -->
	<script src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.min.js"></script>
	<script src="https://cdn.datatables.net/responsive/2.2.3/js/dataTables.responsive.min.js"></script>
	<link rel="stylesheet" href="https://cdn.datatables.net/2.0.8/css/dataTables.dataTables.css" />
  
	<script src="https://cdn.datatables.net/2.0.8/js/dataTables.js"></script>
	<script>
		$(document).ready(function() {

			new DataTable('#chants', {
                ajax: 'lists/<?php echo $carnet; ?>.json'
            });
            $('#chants').on( 'click', 'tbody tr', function () {
                console.log(this);
                var path = this.innerText.split("\t")[2];
                console.log("open : " + globalConfig.addrServer + "/components/visualisation/?lien=" + path);
                window.open(globalConfig.addrServer + "/components/visualisation/?lien=" + path);
            } );
		});


		if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
			// true for mobile device
			document.getElementById("recipients").style.paddingLeft = 0;
			document.getElementById("recipients").style.paddingRight= 0;
			document.getElementById("recipients").style.fontSize = "small";
			document.getElementById("contenu").style.paddingLeft = 0;
			document.getElementById("contenu").style.paddingRight= 0;
		}
	</script>
	<?php } ?>

</div>
</div>
</body>

</html>