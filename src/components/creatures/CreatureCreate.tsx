import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "@mui/icons-material";
import {
    Box,
    Button,
    CircularProgress,
    Grid,
    IconButton,
    InputBase,
    Modal,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SavedCreatureData } from "../../api/firebase/schemas";
import {
    AbilitiesSchema,
    SavedCreatureDataSchema,
} from "../../api/firebase/schemas/SavedCreatureData";
import { searchCreatures } from "../../api/open5e/data/creatures";
import type { Monster } from "../../api/open5e/schemas/monster";
import { useAuth } from "../../auth/useAuth";
import { useTitleContext } from "../../hooks/useTitleContext";

export const CreatureCreate = () => {
    useTitleContext({ value: "New Creature" });
    const auth = useAuth();
    const [searchValue, setSearchValue] = useState("");
    const [creatures, setCreatures] = useState<Monster[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSearch = async () => {
        if (searchValue !== "") {
            setLoading(true);
            // Implement search functionality here
            await searchCreatures(searchValue.trim())
                .then((results) => {
                    setCreatures(results);
                    setOpen(true);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    };
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<SavedCreatureData>({
        resolver: zodResolver(SavedCreatureDataSchema),
        defaultValues: {
            ownerId: auth.user?.uid,
            abilities: {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10,
            },
        },
    });

    const onSubmit = (data: SavedCreatureData) => {
        console.log("Form submitted:", data);
    };

    return (
        <div>
            <Box
                sx={{
                    p: 2,
                    backgroundColor: "primary.light",
                    justifyContent: "center",
                    display: "flex",
                }}
            >
                <Stack
                    gap={2}
                    direction={"row"}
                    sx={{
                        backgroundColor: "white",
                        borderRadius: 50,
                        justifyContent: "space-between",
                        pl: 3,
                        pr: 2,
                        width: {
                            sm: 300,
                        },
                    }}
                >
                    <InputBase
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search Open5e..."
                        sx={{
                            backgroundColor: "white",
                        }}
                    />
                    {loading ? (
                        <Box
                            sx={{ display: "flex", alignItems: "center", p: 1 }}
                        >
                            <CircularProgress
                                size={24}
                                sx={{ color: "secondary.main" }}
                            />
                        </Box>
                    ) : (
                        <IconButton onClick={handleSearch}>
                            <Search />
                        </IconButton>
                    )}
                </Stack>
            </Box>
            <SearchResultModal
                results={creatures}
                open={open}
                setOpen={setOpen}
            />
            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ p: 2 }}
            >
                <Typography variant="h5" gutterBottom>
                    Create Creature
                </Typography>

                <TextField
                    label="Name"
                    fullWidth
                    margin="normal"
                    {...register("name")}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                />

                <TextField
                    label="Max HP"
                    type="number"
                    fullWidth
                    margin="normal"
                    {...register("maxHp", { valueAsNumber: true })}
                    error={!!errors.maxHp}
                    helperText={errors.maxHp?.message}
                />

                <TextField
                    label="Armor Class"
                    type="number"
                    fullWidth
                    margin="normal"
                    {...register("armorClass", { valueAsNumber: true })}
                    error={!!errors.armorClass}
                    helperText={errors.armorClass?.message}
                />

                <TextField
                    label="Speed"
                    fullWidth
                    margin="normal"
                    {...register("speed")}
                    error={!!errors.speed}
                    helperText={errors.speed?.message}
                />

                <Typography variant="h6" mt={3}>
                    Abilities
                </Typography>
                <Grid container spacing={2}>
                    {(
                        Object.keys(AbilitiesSchema.shape) as Array<
                            keyof typeof AbilitiesSchema.shape
                        >
                    ).map((key) => (
                        <Grid key={key}>
                            <TextField
                                label={key[0].toUpperCase() + key.slice(1)}
                                type="number"
                                fullWidth
                                {...register(`abilities.${key}` as const, {
                                    valueAsNumber: true,
                                })}
                                error={!!errors.abilities?.[key]}
                                helperText={errors.abilities?.[key]?.message}
                            />
                        </Grid>
                    ))}
                </Grid>

                <TextField
                    label="Notes"
                    fullWidth
                    margin="normal"
                    multiline
                    minRows={3}
                    {...register("notes")}
                    error={!!errors.notes}
                    helperText={errors.notes?.message}
                />

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                >
                    Save Creature
                </Button>
            </Box>
        </div>
    );
};

const SearchResultModal = (props: {
    results: Monster[];
    open: boolean;
    setOpen: (value: boolean) => void;
}) => {
    const { results, open, setOpen } = props;
    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <TableContainer
                component={Paper}
                sx={{ maxHeight: 440, m: 2, width: "auto" }}
            >
                <Table aria-label="creature table" size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Source</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.map((creature) => (
                            <TableRow key={creature.slug}>
                                <TableCell>{creature.name}</TableCell>
                                <TableCell>
                                    {creature.document__title}{" "}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Modal>
    );
};
